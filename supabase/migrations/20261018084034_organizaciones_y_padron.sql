-- Primera migración: inquilinos, pertenencia y el padrón base.
--
-- Reglas que fija (Arquitectura §8.1, ADR-003 y ADR-004):
--   * Cada tabla de negocio lleva `org_id uuid not null`, también las hijas.
--   * La pertenencia se resuelve en una sola función, `private.mis_orgs()`,
--     en un esquema que la API no expone.
--   * RLS activada en todas las tablas de `public`, con políticas por
--     operación: leer pide pertenecer; escribir pide además el rol.
--   * Las claves foráneas entre tablas de negocio incluyen `org_id`, así una
--     fila no puede colgar de otra administradora ni con la clave de servicio.
--
-- Supuesto (PB-04): roles iniciales administrador, personal y residente. La
-- lista real es una pregunta abierta con el cliente.

-- ---------------------------------------------------------------------------
-- Esquema privado
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon;
-- `authenticated` necesita usar el esquema para evaluar las políticas, que
-- corren con su rol. No puede crear nada en él.
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Organización (la administradora, el inquilino del SaaS)
-- ---------------------------------------------------------------------------

create table public.organizacion (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(btrim(nombre)) between 1 and 200),
  creado_en timestamptz not null default now()
);

comment on table public.organizacion is
  'Una administradora cliente del SaaS. Su id es el org_id de todas las tablas de negocio.';

-- ---------------------------------------------------------------------------
-- Membresía: quién pertenece a qué administradora y con qué rol
-- ---------------------------------------------------------------------------

create table public.membresia (
  org_id uuid not null references public.organizacion (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  rol text not null check (rol in ('administrador', 'personal', 'residente')),
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  primary key (org_id, usuario_id)
);

comment on table public.membresia is
  'Pertenencia de un usuario a una administradora. Quitarla (o desactivarla) corta el acceso al instante.';

-- La consulta de private.mis_orgs() filtra por usuario; la clave primaria
-- empieza por org_id y no sirve para eso.
create index membresia_usuario_activa_idx on public.membresia (usuario_id) include (org_id, rol) where activa;

-- ---------------------------------------------------------------------------
-- Funciones de pertenencia
-- ---------------------------------------------------------------------------

-- Las administradoras del usuario con sesión. `security definer` para leer
-- membresia sin pasar por su propia RLS (que la usa: sería recursiva);
-- `search_path` vacío para que nadie la desvíe con un objeto homónimo.
create function private.mis_orgs()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.org_id
  from public.membresia m
  where m.usuario_id = (select auth.uid())
    and m.activa
$$;

-- ¿El usuario con sesión tiene este rol en esta administradora?
create function private.tiene_rol(p_org_id uuid, p_rol text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.membresia m
    where m.usuario_id = (select auth.uid())
      and m.org_id = p_org_id
      and m.rol = p_rol
      and m.activa
  )
$$;

revoke all on function private.mis_orgs() from public, anon;
revoke all on function private.tiene_rol(uuid, text) from public, anon;
grant execute on function private.mis_orgs() to authenticated;
grant execute on function private.tiene_rol(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Padrón: edificio y unidad
-- ---------------------------------------------------------------------------

create table public.edificio (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null references public.organizacion (id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) between 1 and 200),
  direccion text check (direccion is null or length(btrim(direccion)) between 1 and 300),
  creado_en timestamptz not null default now(),
  primary key (id),
  -- Destino de las claves foráneas compuestas de las tablas hijas. Sirve
  -- además de índice por org_id.
  unique (org_id, id),
  unique (org_id, nombre)
);

comment on table public.edificio is 'Un edificio de la cartera de una administradora.';

create table public.unidad (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  edificio_id uuid not null,
  -- "Unidad", no "bloque inmobiliario" (H2). El número es texto: "101", "L-2".
  numero text not null check (length(btrim(numero)) between 1 and 20),
  -- Los tipos posibles (departamento, local, estacionamiento…) están por
  -- confirmar con el cliente: por eso no hay lista cerrada todavía.
  tipo text check (tipo is null or length(btrim(tipo)) between 1 and 40),
  area_m2 numeric(10, 2) check (area_m2 is null or area_m2 > 0),
  -- Porcentaje de participación en los gastos del edificio (0 a 100).
  participacion numeric(7, 4) check (participacion is null or participacion between 0 and 100),
  creado_en timestamptz not null default now(),
  primary key (id),
  unique (org_id, id),
  -- El número no se repite dentro del mismo edificio (PB-06).
  unique (org_id, edificio_id, numero),
  -- Compuesta: la unidad y su edificio son de la misma administradora.
  foreign key (org_id, edificio_id) references public.edificio (org_id, id) on delete cascade
);

comment on table public.unidad is 'Departamento, local u otro inmueble de un edificio.';

-- ---------------------------------------------------------------------------
-- Permisos de tabla: la API anónima no ve nada; la autenticada pasa por RLS
-- ---------------------------------------------------------------------------

revoke all on public.organizacion, public.membresia, public.edificio, public.unidad from anon;
revoke all on public.organizacion, public.membresia, public.edificio, public.unidad from authenticated;
-- Las administradoras las da de alta el equipo (PB-04): sin insert ni delete.
grant select, update (nombre) on public.organizacion to authenticated;
grant select, insert, delete on public.membresia to authenticated;
grant update (rol, activa) on public.membresia to authenticated;
grant select, insert, update, delete on public.edificio, public.unidad to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.organizacion enable row level security;
alter table public.membresia enable row level security;
alter table public.edificio enable row level security;
alter table public.unidad enable row level security;

-- organizacion ---------------------------------------------------------------

create policy organizacion_lectura on public.organizacion
  for select to authenticated
  using (id in (select private.mis_orgs()));

create policy organizacion_edicion on public.organizacion
  for update to authenticated
  using ((select private.tiene_rol(id, 'administrador')))
  with check ((select private.tiene_rol(id, 'administrador')));

-- membresia ------------------------------------------------------------------

-- Se ven las membresías de las administradoras propias (las propias y las
-- de los compañeros), para que un administrador sepa quién tiene acceso.
create policy membresia_lectura on public.membresia
  for select to authenticated
  using (org_id in (select private.mis_orgs()));

create policy membresia_alta on public.membresia
  for insert to authenticated
  with check ((select private.tiene_rol(org_id, 'administrador')));

create policy membresia_edicion on public.membresia
  for update to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')))
  with check ((select private.tiene_rol(org_id, 'administrador')));

create policy membresia_baja on public.membresia
  for delete to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')));

-- edificio -------------------------------------------------------------------

create policy edificio_lectura on public.edificio
  for select to authenticated
  using (org_id in (select private.mis_orgs()));

create policy edificio_alta on public.edificio
  for insert to authenticated
  with check ((select private.tiene_rol(org_id, 'administrador')));

create policy edificio_edicion on public.edificio
  for update to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')))
  with check ((select private.tiene_rol(org_id, 'administrador')));

create policy edificio_baja on public.edificio
  for delete to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')));

-- unidad ---------------------------------------------------------------------

create policy unidad_lectura on public.unidad
  for select to authenticated
  using (org_id in (select private.mis_orgs()));

create policy unidad_alta on public.unidad
  for insert to authenticated
  with check ((select private.tiene_rol(org_id, 'administrador')));

create policy unidad_edicion on public.unidad
  for update to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')))
  with check ((select private.tiene_rol(org_id, 'administrador')));

create policy unidad_baja on public.unidad
  for delete to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')));
