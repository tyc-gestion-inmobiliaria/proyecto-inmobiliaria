-- Invitaciones (PB-23): el administrador invita a una persona con un rol y,
-- si es residente, con su unidad. La persona abre el enlace del correo, fija
-- su contraseña y acepta; desde ese momento la RLS le deja ver lo suyo.
--
-- Cómo se reparte el trabajo:
--   * La Edge Function `invitar` genera el token, guarda su hash con la
--     sesión de quien invita (la RLS exige que sea administrador) y manda el
--     correo con Supabase Auth. El token en claro solo viaja en el enlace.
--   * `public.aceptar_invitacion(token)` corre con la sesión del invitado y
--     hace la transición entera en una transacción: membresía, ficha de
--     persona ligada a su cuenta y vínculo con la unidad.
--   * `public.cancelar_invitacion(id)` la deja sin efecto.
--   * `public.miembros_de_la_organizacion(org_id)` da al administrador el
--     correo de cada cuenta, que vive en `auth.users` y no se expone.
--
-- Cómo queda ligada la cuenta de un residente a su unidad (lo que lee el
-- portal del residente): `persona.usuario_id = auth.uid()` y un
-- `unidad_persona` de esa persona con la unidad. `private.mis_personas()` y
-- `private.mis_unidades()` ya filtran con eso; esta migración no las cambia.
--
-- Supuestos, a confirmar con el cliente:
--   * Una invitación vale 7 días.
--   * Una cuenta tiene un solo rol por administradora (la clave de
--     `membresia`). Si ya es miembro activo, aceptar no le baja el rol: se
--     queda el mayor (administrador > personal > residente). Así un
--     administrador que vive en un edificio puede quedar además vinculado a
--     su unidad sin perder la administración.
--   * Si la cuenta ya tiene ficha de persona en la administradora, esa ficha
--     es la que se vincula a la unidad (una cuenta, una persona por
--     administradora: `persona_usuario_uq`).
--   * La persona nueva entra con la relación que eligió el administrador; el
--     padrón la puede corregir después.

-- ---------------------------------------------------------------------------
-- Invitación
-- ---------------------------------------------------------------------------

create table public.invitacion (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null references public.organizacion (id) on delete cascade,
  -- Se guarda en minúsculas, como lo escribe Auth.
  correo text not null check (
    correo = lower(btrim(correo))
    and length(correo) <= 254
    and correo ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  rol text not null check (rol in ('administrador', 'personal', 'residente')),
  -- Solo el residente: su unidad y quién es en ella. O una persona que ya
  -- está en el padrón, o el nombre y la relación de una nueva.
  unidad_id uuid,
  persona_id uuid,
  nombre text check (nombre is null or length(btrim(nombre)) between 1 and 200),
  relacion text check (relacion is null or relacion in ('propietario', 'inquilino', 'residente')),
  -- sha256 del token del enlace. El token en claro no se guarda.
  token_hash bytea not null check (length(token_hash) = 32),
  vence_en timestamptz not null default now() + interval '7 days',
  usada_en timestamptz,
  usada_por uuid references auth.users (id) on delete set null,
  cancelada_en timestamptz,
  creada_por uuid default auth.uid() references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  primary key (id),
  unique (org_id, id),
  unique (token_hash),
  foreign key (org_id, unidad_id) references public.unidad (org_id, id) on delete cascade,
  foreign key (org_id, persona_id) references public.persona (org_id, id) on delete cascade,
  constraint invitacion_residente_con_unidad check (
    case
      when rol = 'residente' then
        unidad_id is not null and (persona_id is not null or (nombre is not null and relacion is not null))
      else
        unidad_id is null and persona_id is null and nombre is null and relacion is null
    end
  ),
  -- Usada o cancelada, nunca las dos.
  check (usada_en is null or cancelada_en is null)
);

comment on table public.invitacion is
  'Invitación a una administradora con un rol (y su unidad, si es residente). Se acepta una vez, con el correo invitado.';

-- Una sola invitación abierta por correo y unidad: invitar otra vez es
-- reenviar la misma. Abierta = ni usada ni cancelada (vencer depende de la
-- hora y no cabe en el índice; una vencida se reenvía).
create unique index invitacion_abierta_uq on public.invitacion (org_id, correo, unidad_id) nulls not distinct
  where usada_en is null and cancelada_en is null;

-- Las claves foráneas a unidad y persona, para que borrar una no recorra la tabla.
create index invitacion_unidad_idx on public.invitacion (org_id, unidad_id) where unidad_id is not null;
create index invitacion_persona_idx on public.invitacion (org_id, persona_id) where persona_id is not null;

-- ---------------------------------------------------------------------------
-- Permisos y RLS
-- ---------------------------------------------------------------------------

revoke all on public.invitacion from anon, authenticated;
-- El hash no se lee desde la API: lo compara la función de aceptar.
grant select (id, org_id, correo, rol, unidad_id, persona_id, nombre, relacion, vence_en, usada_en, cancelada_en,
              creada_por, creado_en)
  on public.invitacion to authenticated;
grant insert (org_id, correo, rol, unidad_id, persona_id, nombre, relacion, token_hash) on public.invitacion to authenticated;
-- Reenviar cambia el token y el vencimiento; usarla y cancelarla van por función.
grant update (token_hash, vence_en) on public.invitacion to authenticated;
grant delete on public.invitacion to authenticated;

alter table public.invitacion enable row level security;

-- Solo el administrador de esa administradora: el personal no invita ni ve a
-- quién se invitó, y el invitado no la lee por la API (la acepta la función).
create policy invitacion_lectura on public.invitacion
  for select to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')));

create policy invitacion_alta on public.invitacion
  for insert to authenticated
  with check ((select private.tiene_rol(org_id, 'administrador')) and creada_por = (select auth.uid()));

-- Reenviar solo una abierta.
create policy invitacion_edicion on public.invitacion
  for update to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')) and usada_en is null and cancelada_en is null)
  with check ((select private.tiene_rol(org_id, 'administrador')) and usada_en is null and cancelada_en is null);

create policy invitacion_baja on public.invitacion
  for delete to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')));

-- ---------------------------------------------------------------------------
-- Aceptar
-- ---------------------------------------------------------------------------

-- `security definer` porque el invitado todavía no pertenece a la
-- administradora: no ve la invitación, ni puede darse la membresía, ni crear
-- su ficha. Cada paso lo valida la función. Los rechazos llevan
-- errcode P0001 y en `hint` el motivo, para que la pantalla lo diga:
--   no_existe, cancelada, usada, vencida, otro_correo, persona_ocupada.
create function private.aceptar_invitacion(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_correo text;
  v_inv public.invitacion%rowtype;
  v_persona uuid;
  v_duena uuid;
begin
  if v_uid is null then
    raise exception 'Hace falta una sesión para aceptar la invitación' using errcode = '42501';
  end if;

  select lower(u.email) into v_correo from auth.users u where u.id = v_uid;

  -- `for update`: dos aceptaciones a la vez (doble clic) se ponen en fila.
  select * into v_inv
  from public.invitacion i
  where i.token_hash = sha256(convert_to(coalesce(p_token, ''), 'UTF8'))
  for update;

  if not found then
    raise exception 'La invitación no existe' using errcode = 'P0001', hint = 'no_existe';
  end if;
  if v_inv.cancelada_en is not null then
    raise exception 'La invitación fue cancelada' using errcode = 'P0001', hint = 'cancelada';
  end if;
  if v_inv.usada_en is not null then
    -- Idempotente: la misma cuenta que ya la aceptó recibe lo mismo.
    if v_inv.usada_por = v_uid then
      return v_inv.org_id;
    end if;
    raise exception 'La invitación ya se usó' using errcode = 'P0001', hint = 'usada';
  end if;
  if v_inv.vence_en <= now() then
    raise exception 'La invitación venció' using errcode = 'P0001', hint = 'vencida';
  end if;
  if v_correo is distinct from v_inv.correo then
    raise exception 'La invitación es para otro correo' using errcode = 'P0001', hint = 'otro_correo';
  end if;

  -- Membresía: nueva, reactivada con el rol invitado, o la que ya tenía sin
  -- bajarle el rol.
  insert into public.membresia as m (org_id, usuario_id, rol)
  values (v_inv.org_id, v_uid, v_inv.rol)
  on conflict (org_id, usuario_id) do update
  set rol = case
        when not m.activa then excluded.rol
        when array_position(array['administrador', 'personal', 'residente'], excluded.rol)
           < array_position(array['administrador', 'personal', 'residente'], m.rol) then excluded.rol
        else m.rol
      end,
      activa = true;

  if v_inv.rol = 'residente' then
    -- La ficha que ya tiene la cuenta en esta administradora, si tiene.
    select p.id into v_persona
    from public.persona p
    where p.org_id = v_inv.org_id and p.usuario_id = v_uid;

    if v_persona is null and v_inv.persona_id is not null then
      select p.usuario_id into v_duena
      from public.persona p
      where p.org_id = v_inv.org_id and p.id = v_inv.persona_id
      for update;
      if v_duena is not null and v_duena <> v_uid then
        raise exception 'Esa ficha ya es de otra cuenta' using errcode = 'P0001', hint = 'persona_ocupada';
      end if;
      v_persona := v_inv.persona_id;
    end if;

    if v_persona is null then
      -- Una persona de la unidad con ese correo y sin cuenta: es ella.
      select p.id into v_persona
      from public.persona p
      join public.unidad_persona v on v.org_id = p.org_id and v.persona_id = p.id
      where p.org_id = v_inv.org_id
        and v.unidad_id = v_inv.unidad_id
        and lower(p.correo) = v_correo
        and p.usuario_id is null
      order by p.creado_en
      limit 1;
    end if;

    if v_persona is null then
      insert into public.persona (org_id, nombre, correo)
      values (v_inv.org_id, v_inv.nombre, v_correo)
      returning id into v_persona;
    end if;

    update public.persona set usuario_id = v_uid
    where org_id = v_inv.org_id and id = v_persona and usuario_id is null;

    insert into public.unidad_persona (org_id, unidad_id, persona_id, relacion)
    values (v_inv.org_id, v_inv.unidad_id, v_persona, coalesce(v_inv.relacion, 'residente'))
    on conflict (org_id, unidad_id, persona_id) do nothing;
  end if;

  update public.invitacion
  set usada_en = now(), usada_por = v_uid
  where id = v_inv.id;

  return v_inv.org_id;
end
$$;

revoke all on function private.aceptar_invitacion(text) from public, anon;
grant execute on function private.aceptar_invitacion(text) to authenticated;

-- La puerta pública: la API solo expone `public`.
create function public.aceptar_invitacion(p_token text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.aceptar_invitacion(p_token)
$$;

revoke all on function public.aceptar_invitacion(text) from public, anon;
grant execute on function public.aceptar_invitacion(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Cancelar
-- ---------------------------------------------------------------------------

-- `security definer` porque `cancelada_en` no se puede escribir desde la API.
-- Valida el rol; cancelar dos veces no falla; una usada no se cancela.
create function private.cancelar_invitacion(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.invitacion%rowtype;
begin
  select * into v_inv from public.invitacion i where i.id = p_id for update;
  if not found or not private.tiene_rol(v_inv.org_id, 'administrador') then
    raise exception 'La invitación no existe' using errcode = 'P0001', hint = 'no_existe';
  end if;
  if v_inv.usada_en is not null then
    raise exception 'La invitación ya se usó' using errcode = 'P0001', hint = 'usada';
  end if;
  if v_inv.cancelada_en is null then
    update public.invitacion set cancelada_en = now() where id = p_id;
  end if;
end
$$;

revoke all on function private.cancelar_invitacion(uuid) from public, anon;
grant execute on function private.cancelar_invitacion(uuid) to authenticated;

create function public.cancelar_invitacion(p_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.cancelar_invitacion(p_id)
$$;

revoke all on function public.cancelar_invitacion(uuid) from public, anon;
grant execute on function public.cancelar_invitacion(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Miembros con su correo
-- ---------------------------------------------------------------------------

-- El correo de cada cuenta está en `auth.users`, que la API no expone. Solo
-- el administrador de la administradora recibe filas.
create function private.miembros_de_la_organizacion(p_org_id uuid)
returns table (usuario_id uuid, correo text, rol text, activa boolean, creado_en timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.usuario_id, u.email::text, m.rol, m.activa, m.creado_en
  from public.membresia m
  join auth.users u on u.id = m.usuario_id
  where m.org_id = p_org_id
    and private.tiene_rol(p_org_id, 'administrador')
  order by u.email
$$;

revoke all on function private.miembros_de_la_organizacion(uuid) from public, anon;
grant execute on function private.miembros_de_la_organizacion(uuid) to authenticated;

create function public.miembros_de_la_organizacion(p_org_id uuid)
returns table (usuario_id uuid, correo text, rol text, activa boolean, creado_en timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.miembros_de_la_organizacion(p_org_id)
$$;

revoke all on function public.miembros_de_la_organizacion(uuid) from public, anon;
grant execute on function public.miembros_de_la_organizacion(uuid) to authenticated;
