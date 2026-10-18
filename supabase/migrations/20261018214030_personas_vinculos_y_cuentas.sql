-- Segunda migración: el resto del padrón (PB-06) y el alcance de cada rol
-- (PB-04).
--
-- Agrega persona, su vínculo con la unidad y la cuenta bancaria del edificio,
-- y una vista para validar que las participaciones de un edificio sumen 100 %.
-- Con datos personales en la base, el residente deja de leer todo el padrón
-- de su administradora: ve solo lo suyo.
--
-- Alcance de los roles (supuesto de PB-04, la lista real la confirma el
-- cliente):
--   * administrador: lee y escribe todo lo de su administradora.
--   * personal:      lee todo lo de su administradora, no escribe.
--   * residente:     lee su administradora, su propia membresía, su ficha de
--                    persona, sus vínculos, las unidades a las que está
--                    vinculado, los edificios de esas unidades y sus cuentas
--                    bancarias. No escribe.
--
-- Supuestos de PB-06, a confirmar con el cliente:
--   * Una persona tiene un solo vínculo con cada unidad: propietario,
--     inquilino o residente (quien vive sin ser ninguno de los dos).
--   * El responsable de pago es una marca del vínculo, no una relación más, y
--     hay uno solo por unidad. Puede faltar mientras se arma el padrón.
--   * La cuenta bancaria es del edificio: es donde los residentes depositan.
--   * Estacionamientos, depósitos, vehículos y mascotas quedan fuera hasta que
--     se defina "Espacios" (pregunta abierta de PB-06).

-- ---------------------------------------------------------------------------
-- Funciones de alcance
-- ---------------------------------------------------------------------------

-- Las administradoras donde el usuario con sesión es parte del equipo
-- (administrador o personal): las que puede leer enteras.
create function private.orgs_del_equipo()
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
    and m.rol in ('administrador', 'personal')
$$;

-- ---------------------------------------------------------------------------
-- Persona
-- ---------------------------------------------------------------------------

create table public.persona (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null references public.organizacion (id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) between 1 and 200),
  -- Tipos de documento de Perú. Opcional: el padrón actual no siempre lo trae.
  documento_tipo text check (documento_tipo in ('dni', 'ce', 'pasaporte', 'ruc')),
  documento_numero text check (documento_numero is null or documento_numero ~ '^[A-Za-z0-9]{4,20}$'),
  correo text check (correo is null or (length(correo) <= 254 and correo ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  telefono text check (telefono is null or telefono ~ '^\+?[0-9 ()-]{6,20}$'),
  -- La cuenta con la que entra, si la tiene (el residente). Sin ella la
  -- persona existe en el padrón pero no ve nada.
  usuario_id uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  primary key (id),
  unique (org_id, id),
  -- El tipo y el número van juntos: uno sin el otro no identifica a nadie.
  check ((documento_tipo is null) = (documento_numero is null))
);

comment on table public.persona is
  'Propietario, inquilino o residente del padrón de una administradora. Datos personales (Ley 29733).';

-- Un documento no se repite dentro de la administradora.
create unique index persona_documento_uq on public.persona (org_id, documento_tipo, documento_numero)
  where documento_numero is not null;

-- Una cuenta es a lo sumo una persona por administradora. Empieza por
-- usuario_id porque así la busca private.mis_personas().
create unique index persona_usuario_uq on public.persona (usuario_id, org_id)
  where usuario_id is not null;

-- ---------------------------------------------------------------------------
-- Vínculo unidad-persona
-- ---------------------------------------------------------------------------

create table public.unidad_persona (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  unidad_id uuid not null,
  persona_id uuid not null,
  relacion text not null check (relacion in ('propietario', 'inquilino', 'residente')),
  responsable_pago boolean not null default false,
  creado_en timestamptz not null default now(),
  primary key (id),
  unique (org_id, id),
  -- Un solo vínculo por persona y unidad.
  unique (org_id, unidad_id, persona_id),
  foreign key (org_id, unidad_id) references public.unidad (org_id, id) on delete cascade,
  foreign key (org_id, persona_id) references public.persona (org_id, id) on delete cascade
);

comment on table public.unidad_persona is
  'Quién es quién en una unidad: propietario, inquilino o residente, y quién paga.';

-- Un solo responsable de pago por unidad.
create unique index unidad_persona_un_responsable_uq on public.unidad_persona (org_id, unidad_id)
  where responsable_pago;

-- Para la clave foránea a persona y para "las unidades de esta persona".
create index unidad_persona_persona_idx on public.unidad_persona (org_id, persona_id);

-- ---------------------------------------------------------------------------
-- Cuenta bancaria del edificio
-- ---------------------------------------------------------------------------

create table public.cuenta_bancaria (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  edificio_id uuid not null,
  -- Como la llama la administradora: "Cuenta principal".
  nombre text not null check (length(btrim(nombre)) between 1 and 80),
  banco text not null check (length(btrim(banco)) between 1 and 80),
  numero text not null check (numero ~ '^[0-9][0-9-]{4,28}[0-9]$'),
  -- Código de cuenta interbancario: 20 dígitos.
  cci text check (cci is null or cci ~ '^[0-9]{20}$'),
  moneda text not null default 'PEN' check (moneda in ('PEN', 'USD')),
  creado_en timestamptz not null default now(),
  primary key (id),
  unique (org_id, id),
  unique (org_id, edificio_id, numero),
  foreign key (org_id, edificio_id) references public.edificio (org_id, id) on delete cascade
);

comment on table public.cuenta_bancaria is 'Cuenta donde se depositan los pagos de un edificio.';

-- ---------------------------------------------------------------------------
-- Funciones de alcance del residente (necesitan las tablas de arriba)
-- ---------------------------------------------------------------------------

-- Las fichas de persona del usuario con sesión, en las administradoras donde
-- su membresía sigue activa.
create function private.mis_personas()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.persona p
  where p.usuario_id = (select auth.uid())
    and p.org_id in (select private.mis_orgs())
$$;

-- Las unidades a las que el usuario con sesión está vinculado.
create function private.mis_unidades()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select v.unidad_id
  from public.unidad_persona v
  where v.persona_id in (select private.mis_personas())
$$;

-- Los edificios de esas unidades.
create function private.edificios_de_mis_unidades()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.edificio_id
  from public.unidad u
  where u.id in (select private.mis_unidades())
$$;

revoke all on function private.orgs_del_equipo() from public, anon;
revoke all on function private.mis_personas() from public, anon;
revoke all on function private.mis_unidades() from public, anon;
revoke all on function private.edificios_de_mis_unidades() from public, anon;
grant execute on function private.orgs_del_equipo() to authenticated;
grant execute on function private.mis_personas() to authenticated;
grant execute on function private.mis_unidades() to authenticated;
grant execute on function private.edificios_de_mis_unidades() to authenticated;

-- ---------------------------------------------------------------------------
-- Participación por edificio
-- ---------------------------------------------------------------------------

-- Lo que valida el cierre: las participaciones del edificio suman 100 % y
-- ninguna unidad queda sin la suya. `security_invoker` para que la RLS de
-- unidad se aplique a quien consulta. Pensada para el equipo: a un residente
-- le sumaría solo sus unidades.
create view public.participacion_por_edificio
with (security_invoker = true) as
select
  e.org_id,
  e.id as edificio_id,
  count(u.id)::int as unidades,
  (count(u.id) - count(u.participacion))::int as sin_participacion,
  coalesce(sum(u.participacion), 0)::numeric(9, 4) as total,
  (100 - coalesce(sum(u.participacion), 0))::numeric(9, 4) as diferencia,
  (count(u.id) > 0 and count(u.id) = count(u.participacion) and coalesce(sum(u.participacion), 0) = 100) as suma_cien
from public.edificio e
left join public.unidad u on u.org_id = e.org_id and u.edificio_id = e.id
group by e.org_id, e.id;

comment on view public.participacion_por_edificio is
  'Suma de participaciones por edificio. suma_cien: todas las unidades tienen participación y suman exactamente 100.';

-- ---------------------------------------------------------------------------
-- Cambiar el responsable de pago de una unidad
-- ---------------------------------------------------------------------------

-- Pasar la marca de una persona a otra son dos cambios: quitarla y ponerla.
-- Desde el cliente serían dos pedidos, y entre uno y otro la unidad quedaría
-- sin responsable (o el índice único rechazaría el segundo). Acá van juntos.
-- `security invoker`: la RLS decide si quien llama puede editar el vínculo.
create function public.elegir_responsable_pago(p_vinculo_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_unidad_id uuid;
begin
  select v.org_id, v.unidad_id into v_org_id, v_unidad_id
  from public.unidad_persona v
  where v.id = p_vinculo_id;

  if not found then
    raise exception 'El vínculo no existe' using errcode = 'P0002';
  end if;

  update public.unidad_persona
  set responsable_pago = false
  where org_id = v_org_id and unidad_id = v_unidad_id and responsable_pago and id <> p_vinculo_id;

  update public.unidad_persona
  set responsable_pago = true
  where id = p_vinculo_id;

  if not found then
    raise exception 'Sin permiso para cambiar el responsable de pago' using errcode = '42501';
  end if;
end
$$;

revoke all on function public.elegir_responsable_pago(uuid) from public, anon;
grant execute on function public.elegir_responsable_pago(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Permisos de tabla
-- ---------------------------------------------------------------------------

revoke all on public.persona, public.unidad_persona, public.cuenta_bancaria, public.participacion_por_edificio from anon;
revoke all on public.persona, public.unidad_persona, public.cuenta_bancaria, public.participacion_por_edificio from authenticated;
grant select, insert, update, delete on public.persona, public.unidad_persona, public.cuenta_bancaria to authenticated;
grant select on public.participacion_por_edificio to authenticated;

-- ---------------------------------------------------------------------------
-- RLS de las tablas nuevas
-- ---------------------------------------------------------------------------

alter table public.persona enable row level security;
alter table public.unidad_persona enable row level security;
alter table public.cuenta_bancaria enable row level security;

-- persona ----------------------------------------------------------------------

create policy persona_lectura on public.persona
  for select to authenticated
  using (org_id in (select private.orgs_del_equipo()) or id in (select private.mis_personas()));

create policy persona_alta on public.persona
  for insert to authenticated
  with check ((select private.tiene_rol(org_id, 'administrador')));

create policy persona_edicion on public.persona
  for update to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')))
  with check ((select private.tiene_rol(org_id, 'administrador')));

create policy persona_baja on public.persona
  for delete to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')));

-- unidad_persona ---------------------------------------------------------------

create policy unidad_persona_lectura on public.unidad_persona
  for select to authenticated
  using (org_id in (select private.orgs_del_equipo()) or persona_id in (select private.mis_personas()));

create policy unidad_persona_alta on public.unidad_persona
  for insert to authenticated
  with check ((select private.tiene_rol(org_id, 'administrador')));

create policy unidad_persona_edicion on public.unidad_persona
  for update to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')))
  with check ((select private.tiene_rol(org_id, 'administrador')));

create policy unidad_persona_baja on public.unidad_persona
  for delete to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')));

-- cuenta_bancaria --------------------------------------------------------------

create policy cuenta_bancaria_lectura on public.cuenta_bancaria
  for select to authenticated
  using (org_id in (select private.orgs_del_equipo()) or edificio_id in (select private.edificios_de_mis_unidades()));

create policy cuenta_bancaria_alta on public.cuenta_bancaria
  for insert to authenticated
  with check ((select private.tiene_rol(org_id, 'administrador')));

create policy cuenta_bancaria_edicion on public.cuenta_bancaria
  for update to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')))
  with check ((select private.tiene_rol(org_id, 'administrador')));

create policy cuenta_bancaria_baja on public.cuenta_bancaria
  for delete to authenticated
  using ((select private.tiene_rol(org_id, 'administrador')));

-- ---------------------------------------------------------------------------
-- Lectura de las tablas existentes, recortada para el residente
-- ---------------------------------------------------------------------------

-- membresia: el equipo ve las de su administradora; cualquiera, la suya.
drop policy membresia_lectura on public.membresia;
create policy membresia_lectura on public.membresia
  for select to authenticated
  using (org_id in (select private.orgs_del_equipo()) or (usuario_id = (select auth.uid()) and activa));

drop policy edificio_lectura on public.edificio;
create policy edificio_lectura on public.edificio
  for select to authenticated
  using (org_id in (select private.orgs_del_equipo()) or id in (select private.edificios_de_mis_unidades()));

drop policy unidad_lectura on public.unidad;
create policy unidad_lectura on public.unidad
  for select to authenticated
  using (org_id in (select private.orgs_del_equipo()) or id in (select private.mis_unidades()));
