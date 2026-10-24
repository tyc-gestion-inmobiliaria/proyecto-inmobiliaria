-- Aislamiento entre administradoras (PB-04, PB-12).
--
-- Dos administradoras, A y B. Un usuario de una no lee, no inserta, no
-- modifica y no borra filas de la otra; uno sin membresía no ve nada; el rol
-- anónimo no llega a las tablas; y la clave foránea compuesta impide colgar
-- una unidad de un edificio ajeno aunque se salte la RLS.
--
-- Por cada tabla nueva de public se agrega acá su caso.
begin;
create extension if not exists pgtap with schema extensions;

select plan(54);

-- Datos (como postgres, sin RLS) ----------------------------------------------

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-00000000000a', 'admin.a@prueba.test'),
  ('10000000-0000-4000-8000-00000000000b', 'admin.b@prueba.test'),
  ('10000000-0000-4000-8000-0000000000a2', 'personal.a@prueba.test'),
  ('10000000-0000-4000-8000-000000000000', 'sin.membresia@prueba.test');

insert into public.organizacion (id, nombre) values
  ('20000000-0000-4000-8000-00000000000a', 'Administradora de prueba A'),
  ('20000000-0000-4000-8000-00000000000b', 'Administradora de prueba B');

insert into public.membresia (org_id, usuario_id, rol) values
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'administrador'),
  ('20000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b', 'administrador'),
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-0000000000a2', 'personal');

insert into public.edificio (id, org_id, nombre) values
  ('30000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', 'Edificio A'),
  ('30000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', 'Edificio B');

insert into public.unidad (id, org_id, edificio_id, numero) values
  ('40000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '101'),
  ('40000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', '101');

insert into public.persona (id, org_id, nombre) values
  ('50000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', 'Persona A'),
  ('50000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', 'Persona B');

insert into public.unidad_persona (id, org_id, unidad_id, persona_id, relacion, responsable_pago) values
  ('60000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a',
   '40000000-0000-4000-8000-00000000000a', '50000000-0000-4000-8000-00000000000a', 'propietario', true),
  ('60000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b',
   '40000000-0000-4000-8000-00000000000b', '50000000-0000-4000-8000-00000000000b', 'propietario', true);

insert into public.cuenta_bancaria (id, org_id, edificio_id, nombre, banco, numero) values
  ('70000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a',
   '30000000-0000-4000-8000-00000000000a', 'Cuenta principal', 'Banco de prueba', '000-0000001'),
  ('70000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b',
   '30000000-0000-4000-8000-00000000000b', 'Cuenta principal', 'Banco de prueba', '000-0000002');

insert into public.invitacion (id, org_id, correo, rol, token_hash, creada_por) values
  ('80000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', 'nuevo.a@prueba.test', 'personal',
   sha256('token-a'::bytea), '10000000-0000-4000-8000-00000000000a'),
  ('80000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', 'nuevo.b@prueba.test', 'personal',
   sha256('token-b'::bytea), '10000000-0000-4000-8000-00000000000b');

-- Entra como un usuario: rol authenticated y su id en el JWT.
create function pg_temp.como(p_usuario uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
$$;

-- Administrador de A ----------------------------------------------------------

select pg_temp.como('10000000-0000-4000-8000-00000000000a');
set local role authenticated;

select results_eq(
  $$ select id from public.organizacion $$,
  $$ values ('20000000-0000-4000-8000-00000000000a'::uuid) $$,
  'organizacion: A solo ve su administradora'
);

select results_eq(
  $$ select distinct org_id from public.membresia $$,
  $$ values ('20000000-0000-4000-8000-00000000000a'::uuid) $$,
  'membresia: A solo ve membresías de su administradora'
);

select results_eq(
  $$ select id from public.edificio $$,
  $$ values ('30000000-0000-4000-8000-00000000000a'::uuid) $$,
  'edificio: A solo ve sus edificios'
);

select results_eq(
  $$ select id from public.unidad $$,
  $$ values ('40000000-0000-4000-8000-00000000000a'::uuid) $$,
  'unidad: A solo ve sus unidades'
);

select throws_ok(
  $$ insert into public.edificio (org_id, nombre) values ('20000000-0000-4000-8000-00000000000b', 'Intruso') $$,
  '42501', null,
  'edificio: A no puede insertar en B'
);

select results_eq(
  $$ with x as (update public.edificio set nombre = 'Cambiado' where id = '30000000-0000-4000-8000-00000000000b' returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$,
  'edificio: A no puede modificar uno de B'
);

select results_eq(
  $$ with x as (delete from public.edificio where id = '30000000-0000-4000-8000-00000000000b' returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$,
  'edificio: A no puede borrar uno de B'
);

select throws_ok(
  $$ insert into public.unidad (org_id, edificio_id, numero)
     values ('20000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', '999') $$,
  '42501', null,
  'unidad: A no puede insertar en B'
);

select results_eq(
  $$ with x as (update public.unidad set numero = '999' where id = '40000000-0000-4000-8000-00000000000b' returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$,
  'unidad: A no puede modificar una de B'
);

select results_eq(
  $$ with x as (delete from public.unidad where id = '40000000-0000-4000-8000-00000000000b' returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$,
  'unidad: A no puede borrar una de B'
);

select throws_ok(
  $$ update public.unidad set org_id = '20000000-0000-4000-8000-00000000000b' where id = '40000000-0000-4000-8000-00000000000a' $$,
  '42501', null,
  'unidad: A no puede pasar una unidad suya a B'
);

select throws_ok(
  $$ insert into public.membresia (org_id, usuario_id, rol)
     values ('20000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000a', 'administrador') $$,
  '42501', null,
  'membresia: A no puede darse acceso a B'
);

select results_eq(
  $$ with x as (update public.organizacion set nombre = 'Cambiado' where id = '20000000-0000-4000-8000-00000000000b' returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$,
  'organizacion: A no puede renombrar B'
);

-- persona, vínculo y cuenta bancaria: lo mismo, tabla por tabla ---------------

select results_eq($$ select id from public.persona $$,
  $$ values ('50000000-0000-4000-8000-00000000000a'::uuid) $$, 'persona: A solo ve sus personas');
select results_eq($$ select id from public.unidad_persona $$,
  $$ values ('60000000-0000-4000-8000-00000000000a'::uuid) $$, 'unidad_persona: A solo ve sus vínculos');
select results_eq($$ select id from public.cuenta_bancaria $$,
  $$ values ('70000000-0000-4000-8000-00000000000a'::uuid) $$, 'cuenta_bancaria: A solo ve sus cuentas');
select results_eq($$ select edificio_id from public.participacion_por_edificio $$,
  $$ values ('30000000-0000-4000-8000-00000000000a'::uuid) $$, 'participacion_por_edificio: A solo ve sus edificios');

select throws_ok(
  $$ insert into public.persona (org_id, nombre) values ('20000000-0000-4000-8000-00000000000b', 'Intrusa') $$,
  '42501', null, 'persona: A no puede insertar en B');
select throws_ok(
  $$ insert into public.unidad_persona (org_id, unidad_id, persona_id, relacion)
     values ('20000000-0000-4000-8000-00000000000b', '40000000-0000-4000-8000-00000000000b',
             '50000000-0000-4000-8000-00000000000b', 'inquilino') $$,
  '42501', null, 'unidad_persona: A no puede insertar en B');
select throws_ok(
  $$ insert into public.cuenta_bancaria (org_id, edificio_id, nombre, banco, numero)
     values ('20000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', 'Otra', 'Banco', '000-9999999') $$,
  '42501', null, 'cuenta_bancaria: A no puede insertar en B');

select results_eq(
  $$ with x as (update public.persona set nombre = 'Cambiada' where id = '50000000-0000-4000-8000-00000000000b' returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$, 'persona: A no puede modificar una de B');
select results_eq(
  $$ with x as (update public.unidad_persona set responsable_pago = false where id = '60000000-0000-4000-8000-00000000000b' returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$, 'unidad_persona: A no puede modificar uno de B');
select results_eq(
  $$ with x as (update public.cuenta_bancaria set banco = 'Otro' where id = '70000000-0000-4000-8000-00000000000b' returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$, 'cuenta_bancaria: A no puede modificar una de B');

select results_eq(
  $$ with x as (delete from public.persona where id = '50000000-0000-4000-8000-00000000000b' returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$, 'persona: A no puede borrar una de B');
select results_eq(
  $$ with x as (delete from public.unidad_persona where id = '60000000-0000-4000-8000-00000000000b' returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$, 'unidad_persona: A no puede borrar uno de B');
select results_eq(
  $$ with x as (delete from public.cuenta_bancaria where id = '70000000-0000-4000-8000-00000000000b' returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$, 'cuenta_bancaria: A no puede borrar una de B');

-- invitacion: lo mismo, y el hash del token no se lee desde la API -------------

select results_eq($$ select id from public.invitacion $$,
  $$ values ('80000000-0000-4000-8000-00000000000a'::uuid) $$, 'invitacion: A solo ve sus invitaciones');
select throws_ok(
  $$ insert into public.invitacion (org_id, correo, rol, token_hash)
     values ('20000000-0000-4000-8000-00000000000b', 'intruso@prueba.test', 'administrador', sha256('x'::bytea)) $$,
  '42501', null, 'invitacion: A no puede invitar en B');
select results_eq(
  $$ with x as (update public.invitacion set vence_en = now() + interval '1 year'
                where id = '80000000-0000-4000-8000-00000000000b' returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$, 'invitacion: A no puede reenviar una de B');
select results_eq(
  $$ with x as (delete from public.invitacion where id = '80000000-0000-4000-8000-00000000000b' returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$, 'invitacion: A no puede borrar una de B');
select throws_ok(
  $$ select public.cancelar_invitacion('80000000-0000-4000-8000-00000000000b') $$,
  'P0001', null, 'invitacion: A no puede cancelar una de B');
select throws_ok(
  $$ select token_hash from public.invitacion $$,
  '42501', null, 'invitacion: el hash del token no se lee desde la API');
select is_empty(
  $$ select 1 from public.miembros_de_la_organizacion('20000000-0000-4000-8000-00000000000b') $$,
  'miembros_de_la_organizacion: A no ve los correos del equipo de B');

select throws_ok(
  $$ insert into public.unidad_persona (org_id, unidad_id, persona_id, relacion)
     values ('20000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-00000000000a',
             '50000000-0000-4000-8000-00000000000b', 'inquilino') $$,
  '23503', null, 'unidad_persona: A no puede vincular a su unidad una persona de B');

select lives_ok(
  $$ insert into public.edificio (org_id, nombre) values ('20000000-0000-4000-8000-00000000000a', 'Edificio A2') $$,
  'edificio: A sí puede registrar un edificio propio'
);

-- Personal de A: lee lo de A, no escribe ------------------------------------

reset role;
select pg_temp.como('10000000-0000-4000-8000-0000000000a2');
set local role authenticated;

select results_eq(
  $$ select distinct org_id from public.edificio $$,
  $$ values ('20000000-0000-4000-8000-00000000000a'::uuid) $$,
  'edificio: el personal de A ve solo los de A'
);

select throws_ok(
  $$ insert into public.edificio (org_id, nombre) values ('20000000-0000-4000-8000-00000000000a', 'Sin permiso') $$,
  '42501', null,
  'edificio: el personal no puede registrar edificios'
);

select throws_ok(
  $$ insert into public.persona (org_id, nombre) values ('20000000-0000-4000-8000-00000000000a', 'Sin permiso') $$,
  '42501', null,
  'persona: el personal no puede registrar personas'
);

select is_empty($$ select 1 from public.invitacion $$, 'invitacion: el personal no ve las invitaciones');
select throws_ok(
  $$ insert into public.invitacion (org_id, correo, rol, token_hash)
     values ('20000000-0000-4000-8000-00000000000a', 'otro@prueba.test', 'administrador', sha256('y'::bytea)) $$,
  '42501', null, 'invitacion: el personal no puede invitar');

-- Sin membresía: no ve nada ---------------------------------------------------

reset role;
select pg_temp.como('10000000-0000-4000-8000-000000000000');
set local role authenticated;

select is_empty($$ select 1 from public.organizacion $$, 'sin membresía no ve organizaciones');
select is_empty($$ select 1 from public.membresia $$, 'sin membresía no ve membresías');
select is_empty($$ select 1 from public.edificio $$, 'sin membresía no ve edificios');
select is_empty($$ select 1 from public.unidad $$, 'sin membresía no ve unidades');
select is_empty($$ select 1 from public.persona $$, 'sin membresía no ve personas');
select is_empty($$ select 1 from public.unidad_persona $$, 'sin membresía no ve vínculos');
select is_empty($$ select 1 from public.cuenta_bancaria $$, 'sin membresía no ve cuentas bancarias');
select is_empty($$ select 1 from public.participacion_por_edificio $$, 'sin membresía no ve participaciones');
select is_empty($$ select 1 from public.invitacion $$, 'sin membresía no ve invitaciones');

-- Anónimo: no llega a las tablas --------------------------------------------

reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select throws_ok(
  $$ select 1 from public.edificio $$,
  '42501', null,
  'anon no tiene permiso sobre edificio'
);

select throws_ok(
  $$ select 1 from public.persona $$,
  '42501', null,
  'anon no tiene permiso sobre persona'
);

-- Membresía desactivada: corta el acceso al instante -------------------------

reset role;
update public.membresia set activa = false
where usuario_id = '10000000-0000-4000-8000-00000000000b';

select pg_temp.como('10000000-0000-4000-8000-00000000000b');
set local role authenticated;

select is_empty($$ select 1 from public.edificio $$, 'con la membresía desactivada B deja de ver sus edificios');

-- Integridad entre inquilinos, aun saltando la RLS ----------------------------

reset role;

select throws_ok(
  $$ insert into public.unidad (org_id, edificio_id, numero)
     values ('20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000b', '777') $$,
  '23503', null,
  'unidad: la clave foránea compuesta impide colgarla de un edificio de otra administradora'
);

select is(
  (select nombre from public.edificio where id = '30000000-0000-4000-8000-00000000000b'),
  'Edificio B',
  'edificio de B: sigue intacto tras los intentos de A'
);

select * from finish();
rollback;
