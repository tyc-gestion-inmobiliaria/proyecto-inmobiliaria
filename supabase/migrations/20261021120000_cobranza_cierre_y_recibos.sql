-- Cobranza: el cierre mensual en cuatro pasos y los recibos (PB-13 a PB-18, PB-20)
--
-- Un cierre es el de un edificio en un periodo (un mes). Mientras está en
-- borrador se cargan las lecturas de agua (paso 1) y las partidas del
-- presupuesto (paso 2); el paso 3 es la vista previa que calcula esta base y
-- el 4 emite los recibos en una sola transacción.
--
-- El dinero se calcula acá, no en el cliente (AGENTS.md): `recibos_del_cierre`
-- es la vista previa y `emitir_cierre` la congela en `recibo`. Un recibo
-- emitido no se edita: no hay permiso de update ni de delete sobre él.
--
-- Supuestos, anotados también en preguntas-pendientes de la wiki:
-- - Un solo servicio medido: agua. El recibo de agua del edificio del mes
--   (`monto_agua`) se reparte por consumo entre las unidades con lectura.
-- - Las partidas del presupuesto se reparten por participación.
-- - Redondeo: cada cuota se baja al céntimo y los céntimos que faltan para el
--   total van, de a uno, a las unidades con mayor resto (resto mayor). Así
--   la suma de cuotas es exactamente el total.
-- - Deuda previa: la suma de los cargos de los recibos anteriores de la
--   unidad. Los pagos entran en el Sprint 3; hasta entonces no se descuenta
--   nada.
-- - Consumo atípico: más que el promedio del edificio en el mes por
--   (1 + umbral / 100). El umbral es por cierre, 50 % por defecto.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.cierre (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  edificio_id uuid not null,
  -- El primer día del mes que se cierra.
  periodo date not null check (extract(day from periodo) = 1),
  estado text not null default 'borrador' check (estado in ('borrador', 'emitido')),
  -- El paso donde se quedó el borrador (PB-13: al volver se retoma ahí).
  paso int not null default 1 check (paso between 1 and 4),
  -- El recibo de agua del edificio en el mes, a repartir por consumo.
  monto_agua numeric(12, 2) not null default 0 check (monto_agua >= 0),
  umbral_atipico numeric(5, 2) not null default 50 check (umbral_atipico between 0 and 1000),
  vence date,
  emitido_en timestamptz,
  creado_en timestamptz not null default now(),
  primary key (id),
  unique (org_id, id),
  -- Un cierre por edificio y periodo (PB-13).
  unique (org_id, edificio_id, periodo),
  foreign key (org_id, edificio_id) references public.edificio (org_id, id) on delete cascade,
  check ((estado = 'emitido') = (emitido_en is not null)),
  check (estado = 'borrador' or vence is not null)
);

comment on table public.cierre is 'El cierre mensual de cobranza de un edificio.';

create table public.lectura (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  cierre_id uuid not null,
  unidad_id uuid not null,
  anterior numeric(12, 3) check (anterior is null or anterior >= 0),
  actual numeric(12, 3) check (actual is null or actual >= 0),
  -- Ruta de la foto en el bucket privado `lecturas`: <org_id>/<cierre_id>/<unidad_id>.
  foto text,
  actualizado_en timestamptz not null default now(),
  primary key (id),
  unique (org_id, id),
  unique (org_id, cierre_id, unidad_id),
  foreign key (org_id, cierre_id) references public.cierre (org_id, id) on delete cascade,
  foreign key (org_id, unidad_id) references public.unidad (org_id, id) on delete cascade,
  -- Una lectura menor que la anterior no se guarda: el medidor no retrocede.
  check (actual is null or anterior is null or actual >= anterior)
);

comment on table public.lectura is 'La lectura del medidor de agua de una unidad en un cierre.';

create table public.partida (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  cierre_id uuid not null,
  concepto text not null check (length(btrim(concepto)) between 1 and 120),
  monto numeric(12, 2) not null check (monto > 0),
  orden int not null default 0,
  primary key (id),
  unique (org_id, id),
  foreign key (org_id, cierre_id) references public.cierre (org_id, id) on delete cascade
);

comment on table public.partida is 'Una línea del presupuesto del mes, que se reparte por participación.';

create table public.recibo (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  cierre_id uuid not null,
  edificio_id uuid not null,
  unidad_id uuid not null,
  -- Correlativo por edificio (PB-18).
  numero int not null check (numero > 0),
  periodo date not null,
  unidad_numero text not null,
  participacion numeric(7, 4) not null,
  consumo numeric(12, 3),
  cuota numeric(12, 2) not null,
  agua numeric(12, 2) not null,
  deuda_previa numeric(12, 2) not null,
  total numeric(12, 2) not null,
  vence date not null,
  emitido_en timestamptz not null default now(),
  primary key (id),
  unique (org_id, id),
  unique (org_id, edificio_id, numero),
  unique (org_id, cierre_id, unidad_id),
  foreign key (org_id, cierre_id) references public.cierre (org_id, id) on delete restrict,
  foreign key (org_id, edificio_id) references public.edificio (org_id, id) on delete restrict,
  foreign key (org_id, unidad_id) references public.unidad (org_id, id) on delete restrict,
  check (total = cuota + agua + deuda_previa)
);

comment on table public.recibo is 'El recibo emitido de una unidad. No se edita: se corrige con un ajuste.';

create index lectura_cierre_idx on public.lectura (org_id, cierre_id);
create index partida_cierre_idx on public.partida (org_id, cierre_id);
create index recibo_unidad_idx on public.recibo (org_id, unidad_id, periodo);

-- Un cierre emitido no cambia: ni el cierre, ni sus lecturas, ni sus partidas.
create function private.cierre_en_borrador(p_cierre_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.cierre c where c.id = p_cierre_id and c.estado = 'borrador')
$$;

revoke all on function private.cierre_en_borrador(uuid) from public, anon;
grant execute on function private.cierre_en_borrador(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- El cálculo: consumo, prorrateo al céntimo, deuda previa y total
-- ---------------------------------------------------------------------------

-- Reparte `p_total` entre filas según `peso`, al céntimo, por resto mayor. A
-- igual resto, el desempate es por `orden` (el número de la unidad).
create function private.repartir(p_total numeric, p_pesos jsonb)
returns table (clave uuid, monto numeric)
language sql
immutable
set search_path = ''
as $$
  with filas as (
    select (e ->> 'clave')::uuid as clave, (e ->> 'peso')::numeric as peso, (e ->> 'orden')::text as orden
    from jsonb_array_elements(p_pesos) e
  ),
  suma as (
    select coalesce(sum(peso), 0) as total_peso from filas
  ),
  bruto as (
    select f.clave, f.orden,
      case when s.total_peso > 0 then round(p_total, 2) * 100 * f.peso / s.total_peso else 0 end as centimos
    from filas f cross join suma s
  ),
  piso as (
    select clave, orden, floor(centimos) as base, centimos - floor(centimos) as resto from bruto
  ),
  faltan as (
    select case when (select total_peso from suma) > 0 then (round(p_total, 2) * 100 - coalesce(sum(base), 0))::int else 0 end as n
    from piso
  ),
  ranking as (
    select p.*, row_number() over (order by p.resto desc, p.orden) as puesto from piso p
  )
  select r.clave, ((r.base + case when r.puesto <= (select n from faltan) then 1 else 0 end) / 100)::numeric(12, 2)
  from ranking r
$$;

revoke all on function private.repartir(numeric, jsonb) from public, anon;
grant execute on function private.repartir(numeric, jsonb) to authenticated;

-- La vista previa de los recibos de un cierre (paso 3) y lo que congela la
-- emisión. `security invoker`: la RLS decide qué ve quien consulta.
create function public.recibos_del_cierre(p_cierre_id uuid)
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
    select rc.unidad_id, sum(rc.cuota + rc.agua) as deuda
    from public.recibo rc
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

revoke all on function public.recibos_del_cierre(uuid) from public, anon;
grant execute on function public.recibos_del_cierre(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Abrir un cierre
-- ---------------------------------------------------------------------------

-- Abre el cierre del periodo, o devuelve el que ya existe (PB-13: no hay dos
-- del mismo periodo; si está emitido, se lleva a ese). La lectura anterior de
-- cada unidad es la actual del último cierre emitido.
create function public.abrir_cierre(p_edificio_id uuid, p_periodo date)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_id uuid;
  v_periodo date := date_trunc('month', p_periodo)::date;
begin
  select e.org_id into v_org_id from public.edificio e where e.id = p_edificio_id;
  if not found then
    raise exception 'El edificio no existe' using errcode = 'P0002';
  end if;

  select c.id into v_id from public.cierre c where c.edificio_id = p_edificio_id and c.periodo = v_periodo;
  if found then
    return v_id;
  end if;

  insert into public.cierre (org_id, edificio_id, periodo)
  values (v_org_id, p_edificio_id, v_periodo)
  on conflict (org_id, edificio_id, periodo) do nothing
  returning id into v_id;

  if v_id is null then
    select c.id into v_id from public.cierre c where c.edificio_id = p_edificio_id and c.periodo = v_periodo;
    return v_id;
  end if;

  insert into public.lectura (org_id, cierre_id, unidad_id, anterior)
  select v_org_id, v_id, u.id, (
    select l.actual
    from public.lectura l
    join public.cierre c on c.id = l.cierre_id
    where l.unidad_id = u.id and c.periodo < v_periodo and c.estado = 'emitido' and l.actual is not null
    order by c.periodo desc
    limit 1
  )
  from public.unidad u
  where u.org_id = v_org_id and u.edificio_id = p_edificio_id;

  return v_id;
end
$$;

revoke all on function public.abrir_cierre(uuid, date) from public, anon;
grant execute on function public.abrir_cierre(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Emitir
-- ---------------------------------------------------------------------------

-- Pasa el cierre a emitido. El cliente no puede escribir `estado`: solo esta
-- función, y solo si el cierre ya tiene sus recibos.
create function private.marcar_emitido(p_cierre_id uuid, p_vence date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.recibo r where r.cierre_id = p_cierre_id) then
    raise exception 'El cierre no tiene recibos' using errcode = 'P0001';
  end if;
  update public.cierre
  set estado = 'emitido', emitido_en = now(), vence = p_vence, paso = 4
  where id = p_cierre_id and estado = 'borrador';
end
$$;

revoke all on function private.marcar_emitido(uuid, date) from public, anon;
grant execute on function private.marcar_emitido(uuid, date) to authenticated;

-- Emite los recibos del cierre en una transacción, con numeración correlativa
-- por edificio. Repetirla (doble clic, reintento) no duplica nada: si el
-- cierre ya está emitido devuelve cuántos recibos tiene. Revisa otra vez las
-- validaciones que bloquean (PB-17): participación = 100 % y cuenta bancaria.
create function public.emitir_cierre(p_cierre_id uuid, p_vence date)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_cierre public.cierre;
  v_siguiente int;
  v_emitidos int;
begin
  select * into v_cierre from public.cierre where id = p_cierre_id;
  if not found then
    raise exception 'El cierre no existe' using errcode = 'P0002';
  end if;

  -- El bloqueo de la fila serializa dos emisiones del mismo cierre. La
  -- política de edición solo deja tomar un cierre en borrador: si la otra
  -- emisión ganó, la fila ya no se puede bloquear y se devuelve lo emitido.
  if v_cierre.estado = 'borrador' then
    perform 1 from public.cierre where id = p_cierre_id and estado = 'borrador' for update;
    if not found and not (select private.tiene_rol(v_cierre.org_id, 'administrador')) then
      raise exception 'Sin permiso para emitir' using errcode = '42501';
    end if;
    select * into v_cierre from public.cierre where id = p_cierre_id;
  end if;

  if v_cierre.estado = 'emitido' then
    select count(*) into v_emitidos from public.recibo where cierre_id = p_cierre_id;
    return v_emitidos;
  end if;

  if not (select private.tiene_rol(v_cierre.org_id, 'administrador')) then
    raise exception 'Sin permiso para emitir' using errcode = '42501';
  end if;

  if p_vence is null or p_vence < v_cierre.periodo then
    raise exception 'La fecha de vencimiento no puede ser anterior al periodo' using errcode = '22023';
  end if;

  if not coalesce((select p.suma_cien from public.participacion_por_edificio p where p.edificio_id = v_cierre.edificio_id), false) then
    raise exception 'Las participaciones no suman 100 %%' using errcode = 'P0001', hint = 'participacion';
  end if;

  if not exists (select 1 from public.cuenta_bancaria b where b.org_id = v_cierre.org_id and b.edificio_id = v_cierre.edificio_id) then
    raise exception 'El edificio no tiene cuenta bancaria' using errcode = 'P0001', hint = 'cuenta';
  end if;

  -- Los números del edificio no se pisan aunque emitan dos cierres a la vez.
  perform pg_advisory_xact_lock(hashtext(v_cierre.edificio_id::text));
  select coalesce(max(numero), 0) + 1 into v_siguiente from public.recibo where edificio_id = v_cierre.edificio_id;

  insert into public.recibo (
    org_id, cierre_id, edificio_id, unidad_id, numero, periodo, unidad_numero,
    participacion, consumo, cuota, agua, deuda_previa, total, vence
  )
  select
    v_cierre.org_id, p_cierre_id, v_cierre.edificio_id, r.unidad_id,
    v_siguiente + (row_number() over (order by lpad(r.unidad_numero, 20, '0')))::int - 1,
    v_cierre.periodo, r.unidad_numero, r.participacion, r.consumo, r.cuota, r.agua, r.deuda_previa, r.total, p_vence
  from public.recibos_del_cierre(p_cierre_id) r;

  get diagnostics v_emitidos = row_count;

  perform private.marcar_emitido(p_cierre_id, p_vence);

  return v_emitidos;
end
$$;

revoke all on function public.emitir_cierre(uuid, date) from public, anon;
grant execute on function public.emitir_cierre(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Estado del cierre por edificio, para la cartera (PB-21)
-- ---------------------------------------------------------------------------

create view public.cierre_por_edificio
with (security_invoker = true) as
select c.org_id, c.edificio_id, c.id as cierre_id, c.periodo, c.estado, c.paso
from public.cierre c;

comment on view public.cierre_por_edificio is 'Los cierres de cada edificio, con su estado y el paso del borrador.';

-- ---------------------------------------------------------------------------
-- Permisos de tabla
-- ---------------------------------------------------------------------------

revoke all on public.cierre, public.lectura, public.partida, public.recibo, public.cierre_por_edificio from anon;
revoke all on public.cierre, public.lectura, public.partida, public.recibo, public.cierre_por_edificio from authenticated;
grant select, insert on public.cierre to authenticated;
grant update (paso, monto_agua, umbral_atipico) on public.cierre to authenticated;
grant select, insert, delete on public.lectura to authenticated;
grant update (anterior, actual, foto, actualizado_en) on public.lectura to authenticated;
grant select, insert, update, delete on public.partida to authenticated;
-- El recibo se crea solo por `emitir_cierre`, que corre con los permisos de
-- quien llama: puede insertar, nunca editar ni borrar.
grant select, insert on public.recibo to authenticated;
grant select on public.cierre_por_edificio to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.cierre enable row level security;
alter table public.lectura enable row level security;
alter table public.partida enable row level security;
alter table public.recibo enable row level security;

-- cierre -------------------------------------------------------------------------

create policy cierre_lectura on public.cierre
  for select to authenticated
  using (org_id in (select private.orgs_del_equipo()));

create policy cierre_alta on public.cierre
  for insert to authenticated
  with check ((select private.tiene_rol(org_id, 'administrador')) and estado = 'borrador');

create policy cierre_edicion on public.cierre
  for update to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')) and estado = 'borrador')
  with check ((select private.tiene_rol(org_id, 'administrador')) and estado = 'borrador');

-- Un cierre no se borra: si se abrió por error, se deja en borrador.
create policy cierre_baja on public.cierre
  for delete to authenticated
  using (false);

-- lectura ------------------------------------------------------------------------

create policy lectura_lectura on public.lectura
  for select to authenticated
  using (org_id in (select private.orgs_del_equipo()));

create policy lectura_alta on public.lectura
  for insert to authenticated
  with check ((select private.tiene_rol(org_id, 'administrador')) and (select private.cierre_en_borrador(cierre_id)));

create policy lectura_edicion on public.lectura
  for update to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')) and (select private.cierre_en_borrador(cierre_id)))
  with check ((select private.tiene_rol(org_id, 'administrador')) and (select private.cierre_en_borrador(cierre_id)));

create policy lectura_baja on public.lectura
  for delete to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')) and (select private.cierre_en_borrador(cierre_id)));

-- partida ------------------------------------------------------------------------

create policy partida_lectura on public.partida
  for select to authenticated
  using (org_id in (select private.orgs_del_equipo()));

create policy partida_alta on public.partida
  for insert to authenticated
  with check ((select private.tiene_rol(org_id, 'administrador')) and (select private.cierre_en_borrador(cierre_id)));

create policy partida_edicion on public.partida
  for update to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')) and (select private.cierre_en_borrador(cierre_id)))
  with check ((select private.tiene_rol(org_id, 'administrador')) and (select private.cierre_en_borrador(cierre_id)));

create policy partida_baja on public.partida
  for delete to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')) and (select private.cierre_en_borrador(cierre_id)));

-- recibo -------------------------------------------------------------------------

-- El residente ve los recibos de sus unidades (Sprint 3, PB-25).
create policy recibo_lectura on public.recibo
  for select to authenticated
  using (org_id in (select private.orgs_del_equipo()) or unidad_id in (select private.mis_unidades()));

create policy recibo_alta on public.recibo
  for insert to authenticated
  with check ((select private.tiene_rol(org_id, 'administrador')) and (select private.cierre_en_borrador(cierre_id)));

create policy recibo_edicion on public.recibo
  for update to authenticated
  using (false);

create policy recibo_baja on public.recibo
  for delete to authenticated
  using (false);

-- ---------------------------------------------------------------------------
-- Fotos de las lecturas: bucket privado, una carpeta por administradora
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lecturas', 'lecturas', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy lecturas_foto_lectura on storage.objects
  for select to authenticated
  using (bucket_id = 'lecturas' and ((storage.foldername(name))[1])::uuid in (select private.orgs_del_equipo()));

create policy lecturas_foto_alta on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lecturas' and (select private.tiene_rol(((storage.foldername(name))[1])::uuid, 'administrador')));

create policy lecturas_foto_edicion on storage.objects
  for update to authenticated
  using (bucket_id = 'lecturas' and (select private.tiene_rol(((storage.foldername(name))[1])::uuid, 'administrador')));

create policy lecturas_foto_baja on storage.objects
  for delete to authenticated
  using (bucket_id = 'lecturas' and (select private.tiene_rol(((storage.foldername(name))[1])::uuid, 'administrador')));
