-- Auditoría: quién cambió qué y cuándo en el dinero (PB-31).
--
-- Cada alta y cambio deja su registro con la cuenta, antes y después; un
-- cambio sin cambios no deja rastro; el administrador ve solo lo de su
-- administradora y el personal no lo ve; nadie lo edita ni lo borra, ni
-- siquiera el dueño de la tabla.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

-- Datos (como postgres, sin RLS) ----------------------------------------------

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-00000000000a', 'admin.a@prueba.test'),
  ('10000000-0000-4000-8000-0000000000a2', 'personal.a@prueba.test'),
  ('10000000-0000-4000-8000-00000000000b', 'admin.b@prueba.test');

insert into public.organizacion (id, nombre) values
  ('20000000-0000-4000-8000-00000000000a', 'Administradora de prueba A'),
  ('20000000-0000-4000-8000-00000000000b', 'Administradora de prueba B');

insert into public.membresia (org_id, usuario_id, rol) values
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'administrador'),
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-0000000000a2', 'personal'),
  ('20000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b', 'administrador');

insert into public.edificio (id, org_id, nombre) values
  ('30000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', 'Edificio A'),
  ('30000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', 'Edificio B');

insert into public.unidad (id, org_id, edificio_id, numero, participacion) values
  ('40000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '101', 100),
  ('40000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', '101', 100);

create function pg_temp.como(p_usuario uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
$$;

create temp table ids (clave text primary key, id uuid);
grant all on ids to authenticated;

-- Cada administrador abre el cierre de su edificio y A cambia el agua -----------

select pg_temp.como('10000000-0000-4000-8000-00000000000b');
set local role authenticated;
select public.abrir_cierre('30000000-0000-4000-8000-00000000000b', '2026-10-01');

reset role;
select pg_temp.como('10000000-0000-4000-8000-00000000000a');
set local role authenticated;
insert into ids values ('cierre_a', public.abrir_cierre('30000000-0000-4000-8000-00000000000a', '2026-10-01'));
update public.cierre set monto_agua = 120 where id = (select id from ids where clave = 'cierre_a');
update public.cierre set monto_agua = 120 where id = (select id from ids where clave = 'cierre_a');

select results_eq(
  $$ select accion, usuario_id from public.auditoria
     where tabla = 'cierre' and registro_id = (select id from ids where clave = 'cierre_a') order by id $$,
  $$ values ('alta', '10000000-0000-4000-8000-00000000000a'::uuid), ('cambio', '10000000-0000-4000-8000-00000000000a'::uuid) $$,
  'el cierre deja su alta y su cambio, con la cuenta que lo hizo; guardar lo mismo otra vez no deja rastro'
);

select is(
  (select (antes ->> 'monto_agua')::numeric || ' → ' || (despues ->> 'monto_agua')::numeric from public.auditoria
   where tabla = 'cierre' and accion = 'cambio' and registro_id = (select id from ids where clave = 'cierre_a')),
  '0.00 → 120.00',
  'el cambio guarda el antes y el después'
);

select ok(
  exists (select 1 from public.auditoria where tabla = 'lectura' and accion = 'alta'),
  'las lecturas creadas al abrir el cierre también quedan registradas'
);

select is_empty(
  $$ select 1 from public.auditoria where org_id = '20000000-0000-4000-8000-00000000000b' $$,
  'el administrador de A no ve la auditoría de B'
);

select isnt_empty($$ select 1 from public.auditoria $$, 'el administrador de A ve la suya');

select throws_ok(
  $$ insert into public.auditoria (org_id, tabla, registro_id, accion, despues)
     values ('20000000-0000-4000-8000-00000000000a', 'pago', gen_random_uuid(), 'alta', '{}') $$,
  '42501', null,
  'desde la API no se escribe en la auditoría'
);

select throws_ok(
  $$ update public.auditoria set accion = 'baja' $$,
  '42501', null,
  'desde la API no se edita'
);

select throws_ok(
  $$ delete from public.auditoria $$,
  '42501', null,
  'desde la API no se borra'
);

-- El personal no la ve ---------------------------------------------------------

reset role;
select pg_temp.como('10000000-0000-4000-8000-0000000000a2');
set local role authenticated;

select is_empty($$ select 1 from public.auditoria $$, 'el personal no ve la auditoría');

-- Ni el dueño de la tabla la cambia -------------------------------------------

reset role;

select throws_ok(
  $$ update public.auditoria set accion = 'baja' where tabla = 'cierre' $$,
  '42501', null,
  'ni el dueño de la tabla edita la auditoría'
);

select throws_ok(
  $$ delete from public.auditoria $$,
  '42501', null,
  'ni el dueño de la tabla la borra'
);

select * from finish();
rollback;
