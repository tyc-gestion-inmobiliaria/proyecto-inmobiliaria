-- Pagos: reportar, registrar, validar, rechazar y revertir (PB-26, PB-27, PB-28)
--
-- Un pago es de una unidad. Entra de dos maneras:
--   * reportado: el residente avisa que pagó (portal del residente) y queda
--     "Por validar" hasta que el administrador lo acepte o lo rechace;
--   * registrado: el administrador lo carga desde la ficha de la unidad (pagó
--     en la oficina o por transferencia) y queda aceptado y aplicado.
--
-- Aceptar un pago lo **aplica** a los recibos pendientes de la unidad
-- (`pago_aplicacion`); el saldo del recibo y el de la unidad salen de esas
-- aplicaciones, en la base (`recibo_con_saldo`, `saldo_de_la_unidad`).
--
-- El cliente no escribe en `pago` ni en `pago_aplicacion`: cada transición es
-- una función de `private` (security definer, valida rol, pertenencia y estado
-- anterior) expuesta por un envoltorio en `public` que corre como quien llama,
-- igual que `emitir_cierre` con `private.marcar_emitido`. Todas son
-- idempotentes: el doble clic o el reintento devuelven lo que ya está.
--
-- Supuestos, a confirmar con el cliente (también en preguntas-pendientes):
-- - El pago se aplica al recibo pendiente más antiguo primero (por periodo y
--   número), y dentro del recibo a su cargo propio (cuota + agua). La deuda
--   previa de un recibo no es un cargo: ya está en los anteriores.
-- - Lo que sobra de un pago (paga más de lo que debe) queda a favor de la
--   unidad: baja el saldo de la unidad, pero no se aplica solo a los recibos
--   que se emitan después.
-- - Cualquier persona vinculada a la unidad (propietario, inquilino o
--   residente) puede reportar un pago, no solo el responsable de pago.
-- - Reportar pide número de operación y cuenta destino del edificio; la foto
--   del comprobante es opcional. Registrar (en la oficina) no pide ni cuenta
--   ni operación: puede ser efectivo.
-- - Revertir un pago aceptado lo vuelve a "Por validar" y quita sus
--   aplicaciones. Un recibo emitido después con la deuda previa calculada con
--   ese pago no se corrige: el recibo emitido no se edita (AGENTS.md).
-- - Un pago rechazado no se vuelve a abrir: el residente reporta otro.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.pago (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  edificio_id uuid not null,
  unidad_id uuid not null,
  monto numeric(12, 2) not null check (monto > 0),
  fecha date not null,
  -- El número de operación del banco. Puede faltar si se pagó en efectivo.
  operacion text check (operacion is null or length(btrim(operacion)) between 1 and 40),
  -- La cuenta del edificio donde se depositó.
  cuenta_bancaria_id uuid,
  origen text not null check (origen in ('reportado', 'registrado')),
  estado text not null default 'por_validar' check (estado in ('por_validar', 'aceptado', 'rechazado')),
  motivo_rechazo text check (motivo_rechazo is null or length(btrim(motivo_rechazo)) between 1 and 500),
  -- Ruta en el bucket privado `comprobantes`: <org_id>/<unidad_id>/<clave>.<ext>.
  comprobante text,
  -- La genera el cliente una vez por envío: un reintento con la misma clave
  -- devuelve el pago que ya existe en vez de crear otro.
  clave uuid not null,
  reportado_por uuid references auth.users (id) on delete set null,
  reportado_en timestamptz not null default now(),
  validado_por uuid references auth.users (id) on delete set null,
  validado_en timestamptz,
  primary key (id),
  unique (org_id, id),
  unique (org_id, clave),
  foreign key (org_id, edificio_id) references public.edificio (org_id, id) on delete restrict,
  foreign key (org_id, unidad_id) references public.unidad (org_id, id) on delete restrict,
  foreign key (org_id, cuenta_bancaria_id) references public.cuenta_bancaria (org_id, id) on delete restrict,
  -- Rechazar pide el motivo; ningún otro estado lo lleva.
  check ((estado = 'rechazado') = (motivo_rechazo is not null)),
  -- Aceptado o rechazado, se sabe cuándo; por validar, todavía no.
  check ((estado = 'por_validar') = (validado_en is null)),
  check (comprobante is null or comprobante like org_id::text || '/' || unidad_id::text || '/%')
);

comment on table public.pago is 'Un pago de una unidad, reportado por el residente o registrado por la administración.';

create table public.pago_aplicacion (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  pago_id uuid not null,
  recibo_id uuid not null,
  monto numeric(12, 2) not null check (monto > 0),
  creado_en timestamptz not null default now(),
  primary key (id),
  unique (org_id, id),
  unique (org_id, pago_id, recibo_id),
  foreign key (org_id, pago_id) references public.pago (org_id, id) on delete cascade,
  foreign key (org_id, recibo_id) references public.recibo (org_id, id) on delete restrict
);

comment on table public.pago_aplicacion is 'Cuánto de un pago aceptado cubre cada recibo.';

-- La cola: los pagos por validar de la administradora, del más viejo al más nuevo.
create index pago_cola_idx on public.pago (org_id, estado, reportado_en);
create index pago_unidad_idx on public.pago (org_id, unidad_id, fecha);
create index pago_edificio_idx on public.pago (org_id, edificio_id);
create index pago_cuenta_idx on public.pago (org_id, cuenta_bancaria_id) where cuenta_bancaria_id is not null;
create index pago_aplicacion_recibo_idx on public.pago_aplicacion (org_id, recibo_id);

-- ---------------------------------------------------------------------------
-- Saldos: el recibo y la unidad, con lo aplicado
-- ---------------------------------------------------------------------------

-- El recibo emitido con lo que ya se le aplicó. `cargo` es lo propio del
-- recibo (cuota + agua); `pendiente`, lo que falta cubrir de ese cargo.
create view public.recibo_con_saldo
with (security_invoker = true) as
select
  r.id, r.org_id, r.cierre_id, r.edificio_id, r.unidad_id, r.numero, r.periodo, r.unidad_numero,
  r.participacion, r.consumo, r.cuota, r.agua, r.deuda_previa, r.total, r.vence, r.emitido_en,
  (r.cuota + r.agua)::numeric(12, 2) as cargo,
  coalesce(a.pagado, 0)::numeric(12, 2) as pagado,
  (r.cuota + r.agua - coalesce(a.pagado, 0))::numeric(12, 2) as pendiente
from public.recibo r
left join (
  select pa.recibo_id, sum(pa.monto) as pagado
  from public.pago_aplicacion pa
  group by pa.recibo_id
) a on a.recibo_id = r.id;

comment on view public.recibo_con_saldo is 'Cada recibo con lo pagado y lo que le falta.';

-- La cuenta de cada unidad: lo cargado en recibos, lo pagado (aceptado), el
-- saldo (negativo si queda a favor) y lo que espera validación.
create view public.saldo_de_la_unidad
with (security_invoker = true) as
select
  u.org_id,
  u.edificio_id,
  u.id as unidad_id,
  coalesce(c.cargos, 0)::numeric(12, 2) as cargos,
  coalesce(p.pagado, 0)::numeric(12, 2) as pagado,
  (coalesce(c.cargos, 0) - coalesce(p.pagado, 0))::numeric(12, 2) as saldo,
  coalesce(p.por_validar, 0)::numeric(12, 2) as por_validar
from public.unidad u
left join (
  select r.unidad_id, sum(r.cuota + r.agua) as cargos
  from public.recibo r
  group by r.unidad_id
) c on c.unidad_id = u.id
left join (
  select pg.unidad_id,
    sum(pg.monto) filter (where pg.estado = 'aceptado') as pagado,
    sum(pg.monto) filter (where pg.estado = 'por_validar') as por_validar
  from public.pago pg
  group by pg.unidad_id
) p on p.unidad_id = u.id;

comment on view public.saldo_de_la_unidad is 'Lo cargado, lo pagado y el saldo de cada unidad.';

-- ---------------------------------------------------------------------------
-- La deuda previa del recibo nuevo descuenta lo aplicado
-- ---------------------------------------------------------------------------

-- Igual que en `20261021120000_cobranza_cierre_y_recibos.sql`, salvo la deuda
-- previa: ahora es lo pendiente de los recibos anteriores, no su cargo entero.
create or replace function public.recibos_del_cierre(p_cierre_id uuid)
returns table (
  unidad_id uuid,
  unidad_numero text,
  participacion numeric,
  anterior numeric,
  actual numeric,
  consumo numeric,
  cuota numeric,
  agua numeric,
  deuda_previa numeric,
  total numeric,
  sin_lectura boolean,
  atipico boolean
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_cierre public.cierre;
  v_presupuesto numeric;
  v_promedio numeric;
begin
  select * into v_cierre from public.cierre where id = p_cierre_id;
  if not found then
    raise exception 'El cierre no existe' using errcode = 'P0002';
  end if;

  select coalesce(sum(monto), 0) into v_presupuesto from public.partida where cierre_id = p_cierre_id;

  select avg(l.actual - l.anterior) into v_promedio
  from public.lectura l
  where l.cierre_id = p_cierre_id and l.actual is not null and l.anterior is not null;

  return query
  with unidades as (
    select u.id, u.numero, coalesce(u.participacion, 0) as participacion
    from public.unidad u
    where u.org_id = v_cierre.org_id and u.edificio_id = v_cierre.edificio_id
  ),
  lecturas as (
    select un.id as unidad_id, l.anterior, l.actual,
      case when l.actual is not null and l.anterior is not null then l.actual - l.anterior end as consumo
    from unidades un
    left join public.lectura l on l.cierre_id = p_cierre_id and l.unidad_id = un.id
  ),
  cuotas as (
    select r.clave, r.monto from private.repartir(
      v_presupuesto,
      (select coalesce(jsonb_agg(jsonb_build_object('clave', id, 'peso', participacion, 'orden', lpad(numero, 20, '0'))), '[]') from unidades)
    ) r
  ),
  aguas as (
    select r.clave, r.monto from private.repartir(
      v_cierre.monto_agua,
      (select coalesce(jsonb_agg(jsonb_build_object('clave', le.unidad_id, 'peso', le.consumo, 'orden', lpad(un.numero, 20, '0'))), '[]')
       from lecturas le join unidades un on un.id = le.unidad_id
       where le.consumo is not null)
    ) r
  ),
  deudas as (
    select rc.unidad_id, sum(rc.pendiente) as deuda
    from public.recibo_con_saldo rc
    where rc.org_id = v_cierre.org_id and rc.edificio_id = v_cierre.edificio_id and rc.periodo < v_cierre.periodo
    group by rc.unidad_id
  )
  select
    un.id,
    un.numero,
    un.participacion,
    le.anterior,
    le.actual,
    le.consumo,
    coalesce(c.monto, 0)::numeric(12, 2),
    coalesce(a.monto, 0)::numeric(12, 2),
    coalesce(d.deuda, 0)::numeric(12, 2),
    (coalesce(c.monto, 0) + coalesce(a.monto, 0) + coalesce(d.deuda, 0))::numeric(12, 2),
    le.actual is null,
    coalesce(le.consumo > v_promedio * (1 + v_cierre.umbral_atipico / 100) and v_promedio > 0, false)
  from unidades un
  join lecturas le on le.unidad_id = un.id
  left join cuotas c on c.clave = un.id
  left join aguas a on a.clave = un.id
  left join deudas d on d.unidad_id = un.id
  order by lpad(un.numero, 20, '0');
end
$$;

-- ---------------------------------------------------------------------------
-- Aplicar un pago a los recibos
-- ---------------------------------------------------------------------------

-- Reparte el pago entre los recibos pendientes de su unidad, del más antiguo
-- al más nuevo (supuesto de PB-27). Lo que sobra queda a favor, sin aplicar.
-- Solo la llaman las funciones de abajo: no tiene `execute` para nadie.
create function private.aplicar_pago(p_pago_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pago public.pago;
  v_resta numeric(12, 2);
  v_recibo record;
  v_parte numeric(12, 2);
begin
  select * into v_pago from public.pago where id = p_pago_id;
  -- Dos pagos de la misma unidad no se reparten a la vez el mismo pendiente.
  perform pg_advisory_xact_lock(hashtext('pago:' || v_pago.unidad_id::text));
  v_resta := v_pago.monto - coalesce((select sum(monto) from public.pago_aplicacion where pago_id = p_pago_id), 0);

  for v_recibo in
    select r.id, r.cuota + r.agua - coalesce((select sum(pa.monto) from public.pago_aplicacion pa where pa.recibo_id = r.id), 0) as pendiente
    from public.recibo r
    where r.org_id = v_pago.org_id and r.unidad_id = v_pago.unidad_id
    order by r.periodo, r.numero
  loop
    exit when v_resta <= 0;
    continue when v_recibo.pendiente <= 0;
    v_parte := least(v_resta, v_recibo.pendiente);
    insert into public.pago_aplicacion (org_id, pago_id, recibo_id, monto)
    values (v_pago.org_id, p_pago_id, v_recibo.id, v_parte)
    on conflict (org_id, pago_id, recibo_id) do update set monto = public.pago_aplicacion.monto + excluded.monto;
    v_resta := v_resta - v_parte;
  end loop;
end
$$;

revoke all on function private.aplicar_pago(uuid) from public, anon, authenticated;

-- Lo que comparten reportar y registrar: valida los datos del pago contra la
-- unidad. Errores con `hint` para que la pantalla marque el campo.
create function private.validar_datos_del_pago(
  p_org_id uuid,
  p_edificio_id uuid,
  p_unidad_id uuid,
  p_monto numeric,
  p_fecha date,
  p_cuenta_id uuid,
  p_comprobante text
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_monto is null or p_monto <= 0 or p_monto <> round(p_monto, 2) or p_monto >= 10000000000 then
    raise exception 'El monto tiene que ser mayor que cero, con dos decimales como mucho' using errcode = '22023', hint = 'monto';
  end if;
  -- La fecha es la del depósito: no puede ser futura (en Lima).
  if p_fecha is null or p_fecha > (now() at time zone 'America/Lima')::date then
    raise exception 'La fecha no puede ser posterior a hoy' using errcode = '22023', hint = 'fecha';
  end if;
  if p_cuenta_id is not null and not exists (
    select 1 from public.cuenta_bancaria b
    where b.id = p_cuenta_id and b.org_id = p_org_id and b.edificio_id = p_edificio_id
  ) then
    raise exception 'La cuenta no es del edificio de la unidad' using errcode = '22023', hint = 'cuenta';
  end if;
  if p_comprobante is not null and p_comprobante not like p_org_id::text || '/' || p_unidad_id::text || '/%' then
    raise exception 'El comprobante no es de esta unidad' using errcode = '22023', hint = 'comprobante';
  end if;
end
$$;

revoke all on function private.validar_datos_del_pago(uuid, uuid, uuid, numeric, date, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reportar (residente) y registrar (administrador)
-- ---------------------------------------------------------------------------

-- El residente avisa que pagó. Solo para una unidad suya; queda por validar.
-- Con la misma clave devuelve el pago que ya existe (la red se cortó y el
-- residente reintenta).
create function private.reportar_pago(
  p_unidad_id uuid,
  p_monto numeric,
  p_fecha date,
  p_operacion text,
  p_cuenta_id uuid,
  p_comprobante text,
  p_clave uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unidad public.unidad;
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  -- Primero la pertenencia: a quien no es de la unidad no se le dice si existe.
  if p_unidad_id is null or p_unidad_id not in (select private.mis_unidades()) then
    raise exception 'Sin permiso para reportar pagos de esta unidad' using errcode = '42501';
  end if;
  select * into v_unidad from public.unidad where id = p_unidad_id;

  if p_clave is null then
    raise exception 'Falta la clave del envío' using errcode = '22023', hint = 'clave';
  end if;
  select id into v_id from public.pago where org_id = v_unidad.org_id and clave = p_clave;
  if found then
    if not exists (select 1 from public.pago where id = v_id and unidad_id = p_unidad_id) then
      raise exception 'La clave ya se usó para otro pago' using errcode = '22023', hint = 'clave';
    end if;
    return v_id;
  end if;

  if p_operacion is null or length(btrim(p_operacion)) = 0 then
    raise exception 'Falta el número de operación' using errcode = '22023', hint = 'operacion';
  end if;
  if p_cuenta_id is null then
    raise exception 'Falta la cuenta donde se depositó' using errcode = '22023', hint = 'cuenta';
  end if;
  perform private.validar_datos_del_pago(v_unidad.org_id, v_unidad.edificio_id, p_unidad_id, p_monto, p_fecha, p_cuenta_id, p_comprobante);

  insert into public.pago (org_id, edificio_id, unidad_id, monto, fecha, operacion, cuenta_bancaria_id, origen, comprobante, clave, reportado_por)
  values (v_unidad.org_id, v_unidad.edificio_id, p_unidad_id, p_monto, p_fecha, btrim(p_operacion), p_cuenta_id, 'reportado',
          p_comprobante, p_clave, (select auth.uid()))
  on conflict (org_id, clave) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.pago where org_id = v_unidad.org_id and clave = p_clave;
  end if;
  return v_id;
end
$$;

-- El administrador registra un pago que recibió (oficina, transferencia): queda
-- aceptado y aplicado en la misma transacción. Idempotente por la clave.
create function private.registrar_pago(
  p_unidad_id uuid,
  p_monto numeric,
  p_fecha date,
  p_operacion text,
  p_cuenta_id uuid,
  p_comprobante text,
  p_clave uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unidad public.unidad;
  v_id uuid;
begin
  select * into v_unidad from public.unidad where id = p_unidad_id;
  if not found or not (select private.tiene_rol(v_unidad.org_id, 'administrador')) then
    raise exception 'Sin permiso para registrar pagos de esta unidad' using errcode = '42501';
  end if;

  if p_clave is null then
    raise exception 'Falta la clave del envío' using errcode = '22023', hint = 'clave';
  end if;
  select id into v_id from public.pago where org_id = v_unidad.org_id and clave = p_clave;
  if found then
    if not exists (select 1 from public.pago where id = v_id and unidad_id = p_unidad_id) then
      raise exception 'La clave ya se usó para otro pago' using errcode = '22023', hint = 'clave';
    end if;
    return v_id;
  end if;

  perform private.validar_datos_del_pago(v_unidad.org_id, v_unidad.edificio_id, p_unidad_id, p_monto, p_fecha, p_cuenta_id, p_comprobante);

  insert into public.pago (
    org_id, edificio_id, unidad_id, monto, fecha, operacion, cuenta_bancaria_id, origen, estado, comprobante, clave,
    reportado_por, validado_por, validado_en
  )
  values (
    v_unidad.org_id, v_unidad.edificio_id, p_unidad_id, p_monto, p_fecha, nullif(btrim(coalesce(p_operacion, '')), ''), p_cuenta_id,
    'registrado', 'aceptado', p_comprobante, p_clave, (select auth.uid()), (select auth.uid()), now()
  )
  on conflict (org_id, clave) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.pago where org_id = v_unidad.org_id and clave = p_clave;
    return v_id;
  end if;

  perform private.aplicar_pago(v_id);
  return v_id;
end
$$;

-- ---------------------------------------------------------------------------
-- Validar: aceptar, rechazar, revertir
-- ---------------------------------------------------------------------------

-- Toma el pago bloqueado y comprueba que quien llama lo administra. Así dos
-- clics seguidos esperan uno al otro y el segundo ve el estado nuevo.
create function private.tomar_pago(p_pago_id uuid)
returns public.pago
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pago public.pago;
begin
  select * into v_pago from public.pago where id = p_pago_id for update;
  if not found or not (select private.tiene_rol(v_pago.org_id, 'administrador')) then
    raise exception 'Sin permiso para validar este pago' using errcode = '42501';
  end if;
  return v_pago;
end
$$;

revoke all on function private.tomar_pago(uuid) from public, anon, authenticated;

-- Por validar → aceptado, y se aplica. Devuelve el estado en que queda.
create function private.aceptar_pago(p_pago_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pago public.pago;
begin
  v_pago := private.tomar_pago(p_pago_id);
  if v_pago.estado = 'aceptado' then
    return 'aceptado';
  end if;
  if v_pago.estado = 'rechazado' then
    raise exception 'El pago ya se rechazó' using errcode = 'P0001', hint = 'estado';
  end if;
  update public.pago
  set estado = 'aceptado', validado_por = (select auth.uid()), validado_en = now()
  where id = p_pago_id;
  perform private.aplicar_pago(p_pago_id);
  return 'aceptado';
end
$$;

-- Por validar → rechazado, con su motivo, que el residente ve.
create function private.rechazar_pago(p_pago_id uuid, p_motivo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pago public.pago;
begin
  v_pago := private.tomar_pago(p_pago_id);
  if v_pago.estado = 'rechazado' then
    return 'rechazado';
  end if;
  if p_motivo is null or length(btrim(p_motivo)) = 0 then
    raise exception 'Escribe el motivo del rechazo' using errcode = '22023', hint = 'motivo';
  end if;
  if length(btrim(p_motivo)) > 500 then
    raise exception 'El motivo es demasiado largo' using errcode = '22023', hint = 'motivo';
  end if;
  if v_pago.estado = 'aceptado' then
    raise exception 'El pago está aceptado: revíertelo antes de rechazarlo' using errcode = 'P0001', hint = 'estado';
  end if;
  update public.pago
  set estado = 'rechazado', motivo_rechazo = btrim(p_motivo), validado_por = (select auth.uid()), validado_en = now()
  where id = p_pago_id;
  return 'rechazado';
end
$$;

-- Aceptado → por validar: se quitan sus aplicaciones y los recibos vuelven a
-- deber lo que cubría. El rastro lo deja la auditoría (Sprint 3, otra rama).
create function private.revertir_pago(p_pago_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pago public.pago;
begin
  v_pago := private.tomar_pago(p_pago_id);
  if v_pago.estado = 'por_validar' then
    return 'por_validar';
  end if;
  if v_pago.estado = 'rechazado' then
    raise exception 'Un pago rechazado no se revierte' using errcode = 'P0001', hint = 'estado';
  end if;
  delete from public.pago_aplicacion where pago_id = p_pago_id;
  update public.pago
  set estado = 'por_validar', validado_por = null, validado_en = null
  where id = p_pago_id;
  return 'por_validar';
end
$$;

revoke all on function private.reportar_pago(uuid, numeric, date, text, uuid, text, uuid) from public, anon;
revoke all on function private.registrar_pago(uuid, numeric, date, text, uuid, text, uuid) from public, anon;
revoke all on function private.aceptar_pago(uuid) from public, anon;
revoke all on function private.rechazar_pago(uuid, text) from public, anon;
revoke all on function private.revertir_pago(uuid) from public, anon;
grant execute on function private.reportar_pago(uuid, numeric, date, text, uuid, text, uuid) to authenticated;
grant execute on function private.registrar_pago(uuid, numeric, date, text, uuid, text, uuid) to authenticated;
grant execute on function private.aceptar_pago(uuid) to authenticated;
grant execute on function private.rechazar_pago(uuid, text) to authenticated;
grant execute on function private.revertir_pago(uuid) to authenticated;

-- Lo que la API expone: envoltorios que corren como quien llama.

create function public.reportar_pago(
  p_unidad_id uuid,
  p_monto numeric,
  p_fecha date,
  p_operacion text,
  p_cuenta_id uuid,
  p_comprobante text,
  p_clave uuid
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.reportar_pago(p_unidad_id, p_monto, p_fecha, p_operacion, p_cuenta_id, p_comprobante, p_clave)
$$;

create function public.registrar_pago(
  p_unidad_id uuid,
  p_monto numeric,
  p_fecha date,
  p_operacion text,
  p_cuenta_id uuid,
  p_comprobante text,
  p_clave uuid
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.registrar_pago(p_unidad_id, p_monto, p_fecha, p_operacion, p_cuenta_id, p_comprobante, p_clave)
$$;

create function public.aceptar_pago(p_pago_id uuid)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.aceptar_pago(p_pago_id)
$$;

create function public.rechazar_pago(p_pago_id uuid, p_motivo text)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.rechazar_pago(p_pago_id, p_motivo)
$$;

create function public.revertir_pago(p_pago_id uuid)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.revertir_pago(p_pago_id)
$$;

revoke all on function public.reportar_pago(uuid, numeric, date, text, uuid, text, uuid) from public, anon;
revoke all on function public.registrar_pago(uuid, numeric, date, text, uuid, text, uuid) from public, anon;
revoke all on function public.aceptar_pago(uuid) from public, anon;
revoke all on function public.rechazar_pago(uuid, text) from public, anon;
revoke all on function public.revertir_pago(uuid) from public, anon;
grant execute on function public.reportar_pago(uuid, numeric, date, text, uuid, text, uuid) to authenticated;
grant execute on function public.registrar_pago(uuid, numeric, date, text, uuid, text, uuid) to authenticated;
grant execute on function public.aceptar_pago(uuid) to authenticated;
grant execute on function public.rechazar_pago(uuid, text) to authenticated;
grant execute on function public.revertir_pago(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Permisos de tabla: solo lectura; se escribe por las funciones
-- ---------------------------------------------------------------------------

revoke all on public.pago, public.pago_aplicacion, public.recibo_con_saldo, public.saldo_de_la_unidad from anon;
revoke all on public.pago, public.pago_aplicacion, public.recibo_con_saldo, public.saldo_de_la_unidad from authenticated;
grant select on public.pago, public.pago_aplicacion, public.recibo_con_saldo, public.saldo_de_la_unidad to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.pago enable row level security;
alter table public.pago_aplicacion enable row level security;

-- pago ---------------------------------------------------------------------------

-- El equipo ve los de su administradora; el residente, los de sus unidades
-- (con el motivo si se rechazó).
create policy pago_lectura on public.pago
  for select to authenticated
  using (org_id in (select private.orgs_del_equipo()) or unidad_id in (select private.mis_unidades()));

-- Altas, cambios de estado y bajas, solo por las funciones de arriba.
create policy pago_alta on public.pago
  for insert to authenticated
  with check (false);

create policy pago_edicion on public.pago
  for update to authenticated
  using (false);

-- Un pago no se borra: se rechaza o se revierte.
create policy pago_baja on public.pago
  for delete to authenticated
  using (false);

-- pago_aplicacion -----------------------------------------------------------------

create policy pago_aplicacion_lectura on public.pago_aplicacion
  for select to authenticated
  using (
    org_id in (select private.orgs_del_equipo())
    or pago_id in (select p.id from public.pago p where p.unidad_id in (select private.mis_unidades()))
  );

create policy pago_aplicacion_alta on public.pago_aplicacion
  for insert to authenticated
  with check (false);

create policy pago_aplicacion_edicion on public.pago_aplicacion
  for update to authenticated
  using (false);

create policy pago_aplicacion_baja on public.pago_aplicacion
  for delete to authenticated
  using (false);

-- ---------------------------------------------------------------------------
-- Comprobantes: bucket privado, una carpeta por administradora y unidad
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- La administradora de la carpeta, si la ruta empieza por un uuid.
create function private.org_de_la_ruta(p_ruta text)
returns uuid
language sql
stable
set search_path = ''
as $$
  select case
    when (storage.foldername(p_ruta))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then ((storage.foldername(p_ruta))[1])::uuid
  end
$$;

-- La carpeta `<org_id>/<unidad_id>/…` es de una unidad del usuario: la unidad
-- existe, es de esa administradora y el usuario está vinculado a ella.
create function private.es_carpeta_de_mi_unidad(p_ruta text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_partes text[] := storage.foldername(p_ruta);
  v_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if coalesce(array_length(v_partes, 1), 0) < 2 or v_partes[1] !~ v_uuid or v_partes[2] !~ v_uuid then
    return false;
  end if;
  return exists (
    select 1 from public.unidad u
    where u.id = v_partes[2]::uuid and u.org_id = v_partes[1]::uuid
      and u.id in (select private.mis_unidades())
  );
end
$$;

revoke all on function private.es_carpeta_de_mi_unidad(text) from public, anon;
revoke all on function private.org_de_la_ruta(text) from public, anon;
grant execute on function private.es_carpeta_de_mi_unidad(text) to authenticated;
grant execute on function private.org_de_la_ruta(text) to authenticated;

-- El equipo lee los de su administradora; el residente, los de sus unidades.
create policy comprobantes_lectura on storage.objects
  for select to authenticated
  using (
    bucket_id = 'comprobantes'
    and (private.org_de_la_ruta(name) in (select private.orgs_del_equipo()) or private.es_carpeta_de_mi_unidad(name))
  );

-- Sube el residente para su unidad, o el administrador (pago registrado).
create policy comprobantes_alta on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'comprobantes'
    and (private.es_carpeta_de_mi_unidad(name) or coalesce(private.tiene_rol(private.org_de_la_ruta(name), 'administrador'), false))
  );

-- Reintentar la subida reemplaza el archivo (upsert pide alta, lectura y edición).
create policy comprobantes_edicion on storage.objects
  for update to authenticated
  using (
    bucket_id = 'comprobantes'
    and (private.es_carpeta_de_mi_unidad(name) or coalesce(private.tiene_rol(private.org_de_la_ruta(name), 'administrador'), false))
  )
  with check (
    bucket_id = 'comprobantes'
    and (private.es_carpeta_de_mi_unidad(name) or coalesce(private.tiene_rol(private.org_de_la_ruta(name), 'administrador'), false))
  );

-- Borrar un comprobante, solo el administrador.
create policy comprobantes_baja on storage.objects
  for delete to authenticated
  using (bucket_id = 'comprobantes' and coalesce(private.tiene_rol(private.org_de_la_ruta(name), 'administrador'), false));
