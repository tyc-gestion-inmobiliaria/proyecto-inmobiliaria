-- Semilla para la base local (`supabase db reset`).
--
-- Datos ficticios y genéricos: nunca datos de un cliente ni de sus residentes.
-- Las cuentas solo existen en la base local; la contraseña de todas es
-- `clave-local-123` y no sirve en ningún otro entorno.
--
--   admin.a@ejemplo.test       administrador de "Administradora Demo A"
--   personal.a@ejemplo.test    personal de "Administradora Demo A"
--   admin.b@ejemplo.test       administrador de "Administradora Demo B" (sin edificios)
--   sin.membresia@ejemplo.test cuenta sin administradora

with cuentas (id, email) as (
  values
    ('00000000-0000-4000-8000-0000000000a1'::uuid, 'admin.a@ejemplo.test'),
    ('00000000-0000-4000-8000-0000000000a2'::uuid, 'personal.a@ejemplo.test'),
    ('00000000-0000-4000-8000-0000000000b1'::uuid, 'admin.b@ejemplo.test'),
    ('00000000-0000-4000-8000-000000000001'::uuid, 'sin.membresia@ejemplo.test')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt('clave-local-123', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
  '', '', '', ''
from cuentas;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id::text, id, json_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
from auth.users
where email like '%@ejemplo.test';

insert into public.organizacion (id, nombre) values
  ('00000000-0000-4000-8000-00000000000a', 'Administradora Demo A'),
  ('00000000-0000-4000-8000-00000000000b', 'Administradora Demo B');

insert into public.membresia (org_id, usuario_id, rol) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1', 'administrador'),
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a2', 'personal'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000b1', 'administrador');

insert into public.edificio (id, org_id, nombre) values
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000000a', 'Edificio Demo 1');

insert into public.unidad (org_id, edificio_id, numero) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000e1', '101'),
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000e1', '102');
