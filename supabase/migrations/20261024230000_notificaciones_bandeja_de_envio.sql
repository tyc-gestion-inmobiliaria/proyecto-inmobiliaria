-- Notificaciones: la bandeja de salida de los correos (PB-30).
--
-- La cobranza y los pagos no mandan correos: dejan un envío en `envio`, en
-- la misma transacción del cambio, y la Edge Function `enviar-correos` lo
-- manda después, con reintentos. Es el evento en una tabla de la guía de
-- DDD: notificaciones lee la bandeja sin conocer las columnas de los otros
-- contextos más allá de lo que el disparador copia en `datos`.
--
-- Qué se encola:
--   * Al emitir un recibo: uno por cada responsable de pago de la unidad. Sin
--     responsable o sin correo, el envío queda "sin_correo" con el motivo,
--     para que el administrador lo vea y lo arregle en el padrón.
--   * Al validar o rechazar un pago reportado: un aviso a quien lo reportó
--     (la persona con esa cuenta); si no se la encuentra, al responsable.
--
-- Un mismo aviso no se encola dos veces (clave única con nulos iguales): si
-- un pago se revierte y se vuelve a aceptar, no llega un segundo correo.
--
-- Lo lee el administrador; nadie escribe desde la API: la función usa la
-- clave de servicio, que vive en sus secretos.

create table public.envio (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null references public.organizacion (id) on delete cascade,
  tipo text not null check (tipo in ('recibo', 'pago_validado', 'pago_rechazado')),
  recibo_id uuid,
  pago_id uuid,
  persona_id uuid,
  correo text,
  asunto text not null check (length(asunto) between 1 and 200),
  -- Lo que el correo necesita decir, copiado al encolar: el correo cuenta lo
  -- que pasó en ese momento, aunque después cambie el padrón.
  datos jsonb not null default '{}',
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviado', 'fallido', 'sin_correo')),
  intentos int not null default 0 check (intentos >= 0),
  ultimo_error text,
  proximo_intento timestamptz not null default now(),
  creado_en timestamptz not null default now(),
  enviado_en timestamptz,
  primary key (id),
  unique (org_id, id),
  unique nulls not distinct (org_id, tipo, recibo_id, pago_id, persona_id),
  foreign key (org_id, recibo_id) references public.recibo (org_id, id) on delete cascade,
  foreign key (org_id, pago_id) references public.pago (org_id, id) on delete cascade,
  foreign key (org_id, persona_id) references public.persona (org_id, id) on delete set null (persona_id),
  check ((tipo = 'recibo') = (recibo_id is not null)),
  check ((tipo <> 'recibo') = (pago_id is not null)),
  check (estado <> 'pendiente' or correo is not null),
  check ((estado = 'enviado') = (enviado_en is not null))
);

comment on table public.envio is
  'Bandeja de salida de correos (PB-30). La llenan disparadores de cobranza y pagos; la vacía la Edge Function enviar-correos.';

-- La función toma los pendientes cuyo turno llegó; el administrador mira los de su administradora.
create index envio_pendientes_idx on public.envio (proximo_intento) where estado = 'pendiente';
create index envio_org_idx on public.envio (org_id, creado_en desc);
create index envio_recibo_idx on public.envio (org_id, recibo_id);
create index envio_pago_idx on public.envio (org_id, pago_id);
create index envio_persona_idx on public.envio (org_id, persona_id);

revoke all on public.envio from anon;
revoke all on public.envio from authenticated;
grant select on public.envio to authenticated;

alter table public.envio enable row level security;

create policy envio_lectura on public.envio
  for select to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')));

create policy envio_alta on public.envio
  for insert to authenticated
  with check (false);

create policy envio_edicion on public.envio
  for update to authenticated
  using (false);

create policy envio_baja on public.envio
  for delete to authenticated
  using (false);

-- Recibo emitido: un correo por responsable de pago -------------------------------

create function private.encolar_recibo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_datos jsonb;
begin
  select jsonb_build_object(
    'edificio', e.nombre,
    'unidad', new.unidad_numero,
    'numero', new.numero,
    'periodo', new.periodo,
    'total', new.total,
    'vence', new.vence
  )
  into v_datos
  from public.edificio e
  where e.id = new.edificio_id;

  insert into public.envio (org_id, tipo, recibo_id, persona_id, correo, asunto, datos, estado, ultimo_error)
  select new.org_id, 'recibo', new.id, p.id, p.correo,
         'Tu recibo de ' || to_char(new.periodo, 'MM/YYYY') || ' · Unidad ' || new.unidad_numero,
         v_datos || jsonb_build_object('nombre', p.nombre),
         case when p.correo is null then 'sin_correo' else 'pendiente' end,
         case when p.correo is null then 'El responsable de pago no tiene correo' end
  from public.unidad_persona v
  join public.persona p on p.id = v.persona_id
  where v.unidad_id = new.unidad_id and v.responsable_pago
  on conflict do nothing;

  if not found then
    insert into public.envio (org_id, tipo, recibo_id, asunto, datos, estado, ultimo_error)
    values (new.org_id, 'recibo', new.id, 'Recibo sin destinatario · Unidad ' || new.unidad_numero, v_datos,
            'sin_correo', 'La unidad no tiene responsable de pago')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.encolar_recibo() from public, anon, authenticated;

create trigger encolar_recibo
  after insert on public.recibo
  for each row execute function private.encolar_recibo();

-- Pago validado o rechazado: el aviso a quien lo reportó ----------------------------

create function private.encolar_aviso_de_pago()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo text := case new.estado when 'aceptado' then 'pago_validado' else 'pago_rechazado' end;
  v_persona public.persona;
  v_unidad text;
begin
  select u.numero into v_unidad from public.unidad u where u.id = new.unidad_id;

  -- Quien lo reportó, si su cuenta es una persona de esta administradora; si no, el responsable de pago.
  select p.* into v_persona
  from public.persona p
  where p.org_id = new.org_id and new.reportado_por is not null and p.usuario_id = new.reportado_por
  limit 1;
  if v_persona.id is null then
    select p.* into v_persona
    from public.unidad_persona v
    join public.persona p on p.id = v.persona_id
    where v.unidad_id = new.unidad_id and v.responsable_pago
    limit 1;
  end if;

  insert into public.envio (org_id, tipo, pago_id, persona_id, correo, asunto, datos, estado, ultimo_error)
  values (
    new.org_id, v_tipo, new.id, v_persona.id, v_persona.correo,
    case v_tipo when 'pago_validado' then 'Validamos tu pago' else 'No pudimos validar tu pago' end || ' · Unidad ' || v_unidad,
    jsonb_build_object('nombre', v_persona.nombre, 'unidad', v_unidad, 'monto', new.monto, 'fecha', new.fecha, 'motivo', new.motivo_rechazo),
    case when v_persona.correo is null then 'sin_correo' else 'pendiente' end,
    case when v_persona.id is null then 'No se encontró a quién avisar' when v_persona.correo is null then 'La persona no tiene correo' end
  )
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function private.encolar_aviso_de_pago() from public, anon, authenticated;

create trigger encolar_aviso_de_pago
  after update of estado on public.pago
  for each row
  when (old.estado = 'por_validar' and new.estado in ('aceptado', 'rechazado') and new.origen = 'reportado')
  execute function private.encolar_aviso_de_pago();
