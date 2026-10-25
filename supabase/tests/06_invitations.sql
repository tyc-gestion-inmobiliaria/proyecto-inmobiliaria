-- Invitaciones (PB-23).
--
-- Aceptar crea la membresía con el rol y, si es residente, liga su cuenta a
-- una ficha de persona vinculada a la unidad, de modo que la RLS solo le deja
-- ver esa unidad. Aceptar dos veces da lo mismo. Una vencida, usada,
-- cancelada o de otro correo se rechaza con un motivo que la pantalla sabe
-- decir. El aislamiento entre administradoras está en 02_aislamiento.sql.
begin;
create extension if not exists pgtap with schema extensions;

select plan(42);

-- Datos (como postgres, sin RLS) ----------------------------------------------

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-00000000000a', 'admin.a@prueba.test'),
  ('10000000-0000-4000-8000-0000000000a2', 'personal.a@prueba.test'),
  ('10000000-0000-4000-8000-000000000001', 'personal.nuevo@prueba.test'),
  ('10000000-0000-4000-8000-000000000002', 'residente.nuevo@prueba.test'),
  ('10000000-0000-4000-8000-000000000003', 'vecina@prueba.test'),
  ('10000000-0000-4000-8000-000000000004', 'otra.cuenta@prueba.test'),
  ('10000000-0000-4000-8000-000000000005', 'Mayusculas@Prueba.test');

insert into public.organizacion (id, nombre) values
  ('20000000-0000-4000-8000-00000000000a', 'Administradora de prueba A');

insert into public.membresia (org_id, usuario_id, rol) values
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'administrador'),
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-0000000000a2', 'personal');

insert into public.edificio (id, org_id, nombre) values
  ('30000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', 'Edificio A');

insert into public.unidad (id, org_id, edificio_id, numero) values
  ('40000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '101'),
  ('40000000-0000-4000-8000-000000000102', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '102'),
  ('40000000-0000-4000-8000-000000000103', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '103');

-- La vecina ya está en el padrón de la 101, sin cuenta.
insert into public.persona (id, org_id, nombre, correo) values
  ('50000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-00000000000a', 'Vecina de prueba', 'vecina@prueba.test');
insert into public.unidad_persona (org_id, unidad_id, persona_id, relacion) values
  ('20000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-000000000101',
   '50000000-0000-4000-8000-000000000101', 'propietario');

create function pg_temp.como(p_usuario uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
$$;

-- El motivo del rechazo (el `hint`), o 'ok' si se aceptó.
create function pg_temp.motivo(p_token text) returns text language plpgsql as $$
declare
  v_hint text;
begin
  perform public.aceptar_invitacion(p_token);
  return 'ok';
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  return coalesce(nullif(v_hint, ''), sqlstate);
end
$$;
grant execute on function pg_temp.motivo(text) to authenticated;

create function pg_temp.motivo_cancelar(p_id uuid) returns text language plpgsql as $$
declare
  v_hint text;
begin
  perform public.cancelar_invitacion(p_id);
  return 'ok';
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  return coalesce(nullif(v_hint, ''), sqlstate);
end
$$;
grant execute on function pg_temp.motivo_cancelar(uuid) to authenticated;

-- El administrador invita ------------------------------------------------------

select pg_temp.como('10000000-0000-4000-8000-00000000000a');
set local role authenticated;

select lives_ok(
  $$ insert into public.invitacion (org_id, correo, rol, token_hash) values
       ('20000000-0000-4000-8000-00000000000a', 'personal.nuevo@prueba.test', 'personal', sha256('token-personal'::bytea)),
       ('20000000-0000-4000-8000-00000000000a', 'cancelada@prueba.test', 'personal', sha256('token-cancelada'::bytea)),
       ('20000000-0000-4000-8000-00000000000a', 'mayusculas@prueba.test', 'personal', sha256('token-mayusculas'::bytea)) $$,
  'el administrador invita al personal'
);

select lives_ok(
  $$ insert into public.invitacion (org_id, correo, rol, unidad_id, nombre, relacion, token_hash) values
       ('20000000-0000-4000-8000-00000000000a', 'residente.nuevo@prueba.test', 'residente',
        '40000000-0000-4000-8000-000000000102', 'Residente nuevo', 'inquilino', sha256('token-residente'::bytea)),
       ('20000000-0000-4000-8000-00000000000a', 'vecina@prueba.test', 'residente',
        '40000000-0000-4000-8000-000000000103', 'Vecina de prueba', 'residente', sha256('token-vecina'::bytea)) $$,
  'el administrador invita a un residente nuevo con su unidad, nombre y relación'
);

-- Los ids, para los pasos de abajo.
reset role;
create temp table ids as select id, correo from public.invitacion;
grant select on ids to authenticated;
select pg_temp.como('10000000-0000-4000-8000-00000000000a');
set local role authenticated;

select throws_ok(
  $$ insert into public.invitacion (org_id, correo, rol, token_hash)
     values ('20000000-0000-4000-8000-00000000000a', 'sin.unidad@prueba.test', 'residente', sha256('z'::bytea)) $$,
  '23514', null,
  'un residente sin unidad no se puede invitar'
);

select throws_ok(
  $$ insert into public.invitacion (org_id, correo, rol, unidad_id, token_hash)
     values ('20000000-0000-4000-8000-00000000000a', 'personal.con.unidad@prueba.test', 'personal',
             '40000000-0000-4000-8000-000000000101', sha256('w'::bytea)) $$,
  '23514', null,
  'el personal no lleva unidad'
);

select throws_ok(
  $$ insert into public.invitacion (org_id, correo, rol, token_hash)
     values ('20000000-0000-4000-8000-00000000000a', 'personal.nuevo@prueba.test', 'administrador', sha256('v'::bytea)) $$,
  '23505', null,
  'no hay dos invitaciones abiertas para el mismo correo: se reenvía la que hay'
);

select throws_ok(
  $$ insert into public.invitacion (org_id, correo, rol, token_hash)
     values ('20000000-0000-4000-8000-00000000000a', 'Con.Mayusculas@prueba.test', 'personal', sha256('u'::bytea)) $$,
  '23514', null,
  'el correo se guarda en minúsculas'
);

select lives_ok(
  $$ insert into public.invitacion (org_id, correo, rol, unidad_id, persona_id, token_hash) values
       ('20000000-0000-4000-8000-00000000000a', 'vecina.ficha@prueba.test',
        'residente', '40000000-0000-4000-8000-000000000101', '50000000-0000-4000-8000-000000000101',
        sha256('token-ficha'::bytea)) $$,
  'un residente se puede invitar con su ficha del padrón'
);
reset role;
insert into ids select id, correo from public.invitacion where correo = 'vecina.ficha@prueba.test';
select pg_temp.como('10000000-0000-4000-8000-00000000000a');
set local role authenticated;

select is(
  (select creada_por from public.invitacion where id = (select id from pg_temp.ids where correo = 'personal.nuevo@prueba.test')),
  '10000000-0000-4000-8000-00000000000a'::uuid,
  'la invitación guarda quién invitó'
);

select is(
  (select count(*)::int from public.miembros_de_la_organizacion('20000000-0000-4000-8000-00000000000a')
   where correo in ('admin.a@prueba.test', 'personal.a@prueba.test')),
  2,
  'el administrador ve el correo de cada miembro'
);

-- Reenviar: nuevo token y nuevo vencimiento, solo si sigue abierta.
select results_eq(
  $$ with x as (update public.invitacion set token_hash = sha256('token-cancelada-2'::bytea), vence_en = now() + interval '7 days'
                where id = (select id from pg_temp.ids where correo = 'cancelada@prueba.test') returning 1)
     select count(*)::int from x $$,
  $$ values (1) $$,
  'el administrador reenvía una invitación abierta'
);

select is(pg_temp.motivo_cancelar((select id from pg_temp.ids where correo = 'cancelada@prueba.test')), 'ok', 'el administrador cancela');
select is(pg_temp.motivo_cancelar((select id from pg_temp.ids where correo = 'cancelada@prueba.test')), 'ok', 'cancelar dos veces no falla');

select results_eq(
  $$ with x as (update public.invitacion set vence_en = now() + interval '7 days'
                where id = (select id from pg_temp.ids where correo = 'cancelada@prueba.test') returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$,
  'una cancelada no se reenvía'
);

-- El personal no cancela ni ve correos -----------------------------------------

reset role;
select pg_temp.como('10000000-0000-4000-8000-0000000000a2');
set local role authenticated;

select is(pg_temp.motivo_cancelar((select id from pg_temp.ids where correo = 'personal.nuevo@prueba.test')), 'no_existe', 'el personal no cancela');
select is_empty(
  $$ select 1 from public.miembros_de_la_organizacion('20000000-0000-4000-8000-00000000000a') $$,
  'el personal no ve los correos del equipo'
);

-- Aceptar como personal ----------------------------------------------------------

reset role;
select pg_temp.como('10000000-0000-4000-8000-000000000001');
set local role authenticated;

select is_empty($$ select 1 from public.edificio $$, 'antes de aceptar no ve nada');
select is(public.aceptar_invitacion('token-personal'), '20000000-0000-4000-8000-00000000000a'::uuid,
  'aceptar devuelve la administradora');
select is(public.aceptar_invitacion('token-personal'), '20000000-0000-4000-8000-00000000000a'::uuid,
  'aceptar otra vez da lo mismo');
select results_eq(
  $$ select rol from public.membresia where usuario_id = '10000000-0000-4000-8000-000000000001' $$,
  $$ values ('personal'::text) $$,
  'queda con el rol de la invitación'
);
select is((select count(*)::int from public.edificio), 1, 'el personal nuevo ve los edificios de la administradora');
select is_empty($$ select 1 from public.invitacion $$, 'el invitado no lee las invitaciones');

-- Rechazos, cada uno con su motivo -----------------------------------------------

reset role;
select pg_temp.como('10000000-0000-4000-8000-000000000004');
set local role authenticated;

select is(pg_temp.motivo('token-residente'), 'otro_correo', 'otro correo: se rechaza');
select is(pg_temp.motivo('token-personal'), 'usada', 'usada por otra cuenta: se rechaza');
select is(pg_temp.motivo('token-cancelada-2'), 'cancelada', 'cancelada: se rechaza');
select is(pg_temp.motivo('token-cancelada'), 'no_existe', 'el token anterior a un reenvío ya no sirve');
select is(pg_temp.motivo('no-es-un-token'), 'no_existe', 'un token que no existe: se rechaza');

reset role;
update public.invitacion set vence_en = now() - interval '1 minute' where id = (select id from pg_temp.ids where correo = 'vecina@prueba.test');
select pg_temp.como('10000000-0000-4000-8000-000000000003');
set local role authenticated;

select is(pg_temp.motivo('token-vecina'), 'vencida', 'vencida: se rechaza');
select is_empty($$ select 1 from public.membresia $$, 'un rechazo no deja membresía');

-- El correo de la cuenta se compara sin mayúsculas.
reset role;
select pg_temp.como('10000000-0000-4000-8000-000000000005');
set local role authenticated;
select is(pg_temp.motivo('token-mayusculas'), 'ok', 'el correo coincide aunque la cuenta lo tenga con mayúsculas');

-- Aceptar como residente nuevo ---------------------------------------------------

reset role;
select pg_temp.como('10000000-0000-4000-8000-000000000002');
set local role authenticated;

select is(pg_temp.motivo('token-residente'), 'ok', 'el residente acepta');
select results_eq($$ select id from public.unidad $$,
  $$ values ('40000000-0000-4000-8000-000000000102'::uuid) $$,
  'el residente ve solo su unidad');
select results_eq(
  $$ select p.nombre, p.correo, v.relacion from public.persona p join public.unidad_persona v on v.persona_id = p.id $$,
  $$ values ('Residente nuevo'::text, 'residente.nuevo@prueba.test'::text, 'inquilino'::text) $$,
  'queda una ficha nueva ligada a su cuenta y vinculada a la unidad'
);

-- Aceptar con la ficha que ya estaba en el padrón ----------------------------------

reset role;
select pg_temp.como('10000000-0000-4000-8000-000000000003');
set local role authenticated;
select is(pg_temp.motivo('token-ficha'), 'otro_correo', 'la ficha no cambia el correo invitado');

reset role;
update public.invitacion set correo = 'vecina@prueba.test', vence_en = now() + interval '1 day'
where id = (select id from pg_temp.ids where correo = 'vecina.ficha@prueba.test');
delete from public.invitacion where id = (select id from pg_temp.ids where correo = 'vecina@prueba.test');
select pg_temp.como('10000000-0000-4000-8000-000000000003');
set local role authenticated;

select is(pg_temp.motivo('token-ficha'), 'ok', 'la vecina acepta');
select results_eq($$ select id from public.persona $$,
  $$ values ('50000000-0000-4000-8000-000000000101'::uuid) $$,
  'se liga la ficha que ya existía, sin duplicarla');
select results_eq($$ select id from public.unidad $$,
  $$ values ('40000000-0000-4000-8000-000000000101'::uuid) $$,
  'la vecina ve solo su unidad');

-- Un administrador que además vive en un edificio no pierde la administración --

reset role;
insert into public.invitacion (org_id, correo, rol, unidad_id, nombre, relacion, token_hash, creada_por)
values ('20000000-0000-4000-8000-00000000000a', 'admin.a@prueba.test', 'residente', '40000000-0000-4000-8000-000000000103',
        'Administrador vecino', 'propietario', sha256('token-admin'::bytea), '10000000-0000-4000-8000-00000000000a');
select pg_temp.como('10000000-0000-4000-8000-00000000000a');
set local role authenticated;

select is(pg_temp.motivo('token-admin'), 'ok', 'un administrador acepta una invitación de residente');
select results_eq(
  $$ select rol from public.membresia where usuario_id = '10000000-0000-4000-8000-00000000000a' $$,
  $$ values ('administrador'::text) $$,
  'aceptar no le baja el rol'
);
select ok(
  '40000000-0000-4000-8000-000000000103'::uuid in (select private.mis_unidades()),
  'y queda vinculado a su unidad'
);

-- La pantalla pregunta si la cuenta todavía no tiene contraseña ----------------

select is(public.cuenta_sin_contrasena(), true, 'una cuenta creada por invitación no tiene contraseña');
reset role;
update auth.users set encrypted_password = 'x' where id = '10000000-0000-4000-8000-00000000000a';
select pg_temp.como('10000000-0000-4000-8000-00000000000a');
set local role authenticated;
select is(public.cuenta_sin_contrasena(), false, 'con contraseña, no la pide');

-- Anónimo: no acepta ----------------------------------------------------------------

reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select throws_ok(
  $$ select public.aceptar_invitacion('token-residente') $$,
  '42501', null,
  'anon no puede llamar a aceptar_invitacion'
);

select * from finish();
rollback;
