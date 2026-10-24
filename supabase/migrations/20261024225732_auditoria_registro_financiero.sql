-- Auditoría: quién cambió qué y cuándo en el dinero (PB-31).
--
-- Un disparador en las tablas que mueven dinero escribe en `auditoria` cada
-- alta, cambio y baja, con la cuenta que lo hizo, la fecha y la fila antes y
-- después. Tablas: cierre (presupuesto y agua del mes), lectura, partida,
-- recibo, pago (con sus aceptaciones, rechazos y reversiones) y
-- pago_aplicacion (lo que cada pago cubre de cada recibo).
--
-- El registro solo se agrega: nadie lo edita ni lo borra, ni desde la API ni
-- como dueño de la tabla (un disparador lo impide). Por eso una
-- administradora con historia no se borra en cascada: la clave foránea no
-- tiene `on delete cascade`.
--
-- Lo lee solo el administrador de esa administradora (supuesto: el personal y
-- el residente no lo necesitan; la junta lo pide al administrador).

create table public.auditoria (
  id bigint generated always as identity,
  org_id uuid not null references public.organizacion (id),
  tabla text not null check (tabla in ('cierre', 'lectura', 'partida', 'recibo', 'pago', 'pago_aplicacion')),
  registro_id uuid not null,
  accion text not null check (accion in ('alta', 'cambio', 'baja')),
  antes jsonb,
  despues jsonb,
  -- La cuenta que hizo el cambio; null si lo hizo el sistema (una migración, un proceso).
  usuario_id uuid references auth.users (id) on delete set null,
  en timestamptz not null default now(),
  primary key (id),
  check ((accion = 'alta') = (antes is null)),
  check ((accion = 'baja') = (despues is null))
);

comment on table public.auditoria is
  'Registro de cambios en el dinero (PB-31). Solo se agrega: no admite update ni delete para nadie.';

-- Se consulta por administradora y de lo más nuevo a lo más viejo, o por la historia de una fila.
create index auditoria_org_en_idx on public.auditoria (org_id, en desc);
create index auditoria_registro_idx on public.auditoria (org_id, tabla, registro_id);
create index auditoria_usuario_idx on public.auditoria (usuario_id);

-- Desde la API solo se lee; el anónimo, nada.
revoke all on public.auditoria from anon;
revoke all on public.auditoria from authenticated;
grant select on public.auditoria to authenticated;

alter table public.auditoria enable row level security;

create policy auditoria_lectura on public.auditoria
  for select to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')));

-- Escribe solo el disparador (security definer); desde la API, nada. Sin
-- permisos de escritura las políticas no se llegan a mirar, pero quedan por si
-- alguien los devuelve.
create policy auditoria_alta on public.auditoria
  for insert to authenticated
  with check (false);

create policy auditoria_edicion on public.auditoria
  for update to authenticated
  using (false);

create policy auditoria_baja on public.auditoria
  for delete to authenticated
  using (false);

-- Ni el dueño de la tabla la cambia: lo escrito, escrito está.
create function private.auditoria_inmutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'La auditoría no se edita ni se borra'
    using errcode = '42501';
end;
$$;

revoke all on function private.auditoria_inmutable() from public, anon, authenticated;

create trigger auditoria_inmutable
  before update or delete on public.auditoria
  for each row execute function private.auditoria_inmutable();

create trigger auditoria_sin_vaciar
  before truncate on public.auditoria
  for each statement execute function private.auditoria_inmutable();

-- El que escribe: una fila por alta, cambio o baja. Un cambio que no cambia
-- nada (el mismo valor guardado otra vez) no deja rastro.
create function private.auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_despues jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and v_antes = v_despues then
    return new;
  end if;
  insert into public.auditoria (org_id, tabla, registro_id, accion, antes, despues, usuario_id)
  values (
    coalesce((v_despues ->> 'org_id')::uuid, (v_antes ->> 'org_id')::uuid),
    tg_table_name,
    coalesce((v_despues ->> 'id')::uuid, (v_antes ->> 'id')::uuid),
    case tg_op when 'INSERT' then 'alta' when 'UPDATE' then 'cambio' else 'baja' end,
    v_antes,
    v_despues,
    (select auth.uid())
  );
  return coalesce(new, old);
end;
$$;

revoke all on function private.auditar() from public, anon, authenticated;

create trigger auditar after insert or update or delete on public.cierre
  for each row execute function private.auditar();
create trigger auditar after insert or update or delete on public.lectura
  for each row execute function private.auditar();
create trigger auditar after insert or update or delete on public.partida
  for each row execute function private.auditar();
create trigger auditar after insert or update or delete on public.recibo
  for each row execute function private.auditar();
create trigger auditar after insert or update or delete on public.pago
  for each row execute function private.auditar();
create trigger auditar after insert or update or delete on public.pago_aplicacion
  for each row execute function private.auditar();
