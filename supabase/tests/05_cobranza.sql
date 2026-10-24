-- Cobranza: el cierre mensual y los recibos (PB-13 a PB-18, PB-22).
--
-- Aislamiento de cierre, lectura, partida y recibo entre administradoras; el
-- cálculo de la vista previa (prorrateo al céntimo, agua por consumo, deuda
-- previa, consumo atípico); la emisión en una transacción, sin duplicar con
-- un reintento; y el recibo emitido, que ya no se toca.
begin;
create extension if not exists pgtap with schema extensions;

select plan(31);

-- Datos (como postgres, sin RLS) ----------------------------------------------

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-00000000000a', 'admin.a@prueba.test'),
  ('10000000-0000-4000-8000-00000000000b', 'admin.b@prueba.test'),
  ('10000000-0000-4000-8000-0000000000a2', 'personal.a@prueba.test');

insert into public.organizacion (id, nombre) values
  ('20000000-0000-4000-8000-00000000000a', 'Administradora de prueba A'),
  ('20000000-0000-4000-8000-00000000000b', 'Administradora de prueba B');

insert into public.membresia (org_id, usuario_id, rol) values
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'administrador'),
  ('20000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b', 'administrador'),
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-0000000000a2', 'personal');

insert into public.edificio (id, org_id, nombre) values
  ('30000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', 'Edificio A'),
  ('30000000-0000-4000-8000-0000000000a2', '20000000-0000-4000-8000-00000000000a', 'Edificio A sin cuenta'),
  ('30000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', 'Edificio B');

-- 50 + 30 + 20 = 100 %.
insert into public.unidad (id, org_id, edificio_id, numero, participacion) values
  ('40000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '101', 50),
  ('40000000-0000-4000-8000-000000000102', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '102', 30),
  ('40000000-0000-4000-8000-000000000103', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '103', 20),
  ('40000000-0000-4000-8000-0000000000a2', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-0000000000a2', '1', 100),
  ('40000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', '101', 100);

insert into public.cuenta_bancaria (org_id, edificio_id, nombre, banco, numero) values
  ('20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', 'Cuenta principal', 'Banco de prueba', '000-0000001'),
  ('20000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', 'Cuenta principal', 'Banco de prueba', '000-0000002');

create function pg_temp.como(p_usuario uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
$$;

-- Guarda ids entre pasos, sin depender de qué ve cada rol.
create temp table ids (clave text primary key, id uuid);
grant all on ids to authenticated;

-- Administrador de A: abre el cierre y lo carga --------------------------------

select pg_temp.como('10000000-0000-4000-8000-00000000000a');
set local role authenticated;

insert into ids values ('cierre_a', public.abrir_cierre('30000000-0000-4000-8000-00000000000a', '2026-09-15'));

select is((select periodo from public.cierre where id = (select id from ids where clave = 'cierre_a')), '2026-09-01'::date,
  'abrir_cierre lleva la fecha al primer día del mes');

select is((select count(*)::int from public.lectura where cierre_id = (select id from ids where clave = 'cierre_a')), 3,
  'abrir_cierre deja una lectura por unidad');

select is(public.abrir_cierre('30000000-0000-4000-8000-00000000000a', '2026-09-01'), (select id from ids where clave = 'cierre_a'),
  'abrir otra vez el mismo periodo lleva al cierre que ya existe');

update public.lectura set anterior = 10, actual = 20
where cierre_id = (select id from ids where clave = 'cierre_a') and unidad_id = '40000000-0000-4000-8000-000000000101';
update public.lectura set anterior = 5, actual = 35
where cierre_id = (select id from ids where clave = 'cierre_a') and unidad_id = '40000000-0000-4000-8000-000000000102';

select throws_ok(
  $$ update public.lectura set anterior = 50, actual = 40
     where cierre_id = (select id from ids where clave = 'cierre_a') and unidad_id = '40000000-0000-4000-8000-000000000103' $$,
  '23514', null, 'una lectura menor que la anterior no se guarda');

update public.cierre set monto_agua = 100 where id = (select id from ids where clave = 'cierre_a');
insert into public.partida (org_id, cierre_id, concepto, monto) values
  ('20000000-0000-4000-8000-00000000000a', (select id from ids where clave = 'cierre_a'), 'Limpieza', 600.01),
  ('20000000-0000-4000-8000-00000000000a', (select id from ids where clave = 'cierre_a'), 'Vigilancia', 400);

-- La vista previa -------------------------------------------------------------

create temp table previa as select * from public.recibos_del_cierre((select id from ids where clave = 'cierre_a'));

select is((select sum(cuota) from previa), 1000.01::numeric, 'las cuotas suman exactamente el presupuesto');
select is((select cuota from previa where unidad_numero = '101'), 500.01::numeric, 'el céntimo que sobra va al resto mayor');
select is((select cuota from previa where unidad_numero = '103'), 200.00::numeric, 'la cuota es la parte de la participación');
select is((select agua from previa where unidad_numero = '102'), 75.00::numeric, 'el agua se reparte por consumo');
select is((select agua from previa where unidad_numero = '103'), 0.00::numeric, 'sin lectura no paga agua');
select ok((select sin_lectura from previa where unidad_numero = '103'), 'la unidad sin lectura lleva su alerta');
select ok(not (select atipico from previa where unidad_numero = '102'), 'con el umbral de 50 % el 102 no es atípico');
select is((select total from previa where unidad_numero = '101'), 525.01::numeric, 'el total suma cuota y agua');

update public.cierre set umbral_atipico = 40 where id = (select id from ids where clave = 'cierre_a');
select ok((select atipico from public.recibos_del_cierre((select id from ids where clave = 'cierre_a')) where unidad_numero = '102'),
  'con el umbral de 40 % el 102 es atípico');

-- Emitir ------------------------------------------------------------------------

insert into ids values ('cierre_sin_cuenta', public.abrir_cierre('30000000-0000-4000-8000-0000000000a2', '2026-09-01'));
select throws_ok(
  $$ select public.emitir_cierre((select id from ids where clave = 'cierre_sin_cuenta'), '2026-10-15') $$,
  'P0001', 'El edificio no tiene cuenta bancaria', 'sin cuenta bancaria no se emite');

select is(public.emitir_cierre((select id from ids where clave = 'cierre_a'), '2026-10-15'), 3, 'emite un recibo por unidad');
select is(public.emitir_cierre((select id from ids where clave = 'cierre_a'), '2026-10-15'), 3, 'repetir la emisión no falla');
select is((select count(*)::int from public.recibo where cierre_id = (select id from ids where clave = 'cierre_a')), 3,
  'repetir la emisión no duplica recibos');
select results_eq(
  $$ select numero from public.recibo where cierre_id = (select id from ids where clave = 'cierre_a') order by numero $$,
  $$ values (1), (2), (3) $$, 'la numeración es correlativa por edificio');
select is((select estado from public.cierre where id = (select id from ids where clave = 'cierre_a')), 'emitido',
  'el cierre queda emitido');

select throws_ok(
  $$ update public.recibo set total = 0 where cierre_id = (select id from ids where clave = 'cierre_a') $$,
  '42501', null, 'un recibo emitido no se edita');
select results_eq(
  $$ with x as (update public.lectura set actual = 99 where cierre_id = (select id from ids where clave = 'cierre_a') returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$, 'las lecturas de un cierre emitido no cambian');
select results_eq(
  $$ with x as (update public.cierre set paso = 1 where id = (select id from ids where clave = 'cierre_a') returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$, 'un cierre emitido no vuelve a borrador');

-- El mes siguiente -----------------------------------------------------------

insert into ids values ('cierre_a_oct', public.abrir_cierre('30000000-0000-4000-8000-00000000000a', '2026-10-01'));
select is((select anterior from public.lectura where cierre_id = (select id from ids where clave = 'cierre_a_oct')
           and unidad_id = '40000000-0000-4000-8000-000000000101'), 20.000::numeric,
  'la lectura anterior es la del último cierre emitido');
select is((select deuda_previa from public.recibos_del_cierre((select id from ids where clave = 'cierre_a_oct')) where unidad_numero = '101'),
  525.01::numeric, 'la deuda previa suma los recibos anteriores');

-- Personal de A: lee, no escribe ----------------------------------------------

reset role;
select pg_temp.como('10000000-0000-4000-8000-0000000000a2');
set local role authenticated;

select is((select count(*)::int from public.recibo), 3, 'el personal ve los recibos de su administradora');
select throws_ok(
  $$ select public.emitir_cierre((select id from ids where clave = 'cierre_a_oct'), '2026-11-15') $$,
  '42501', null, 'el personal no emite');
select throws_ok(
  $$ select public.abrir_cierre('30000000-0000-4000-8000-00000000000a', '2026-11-01') $$,
  '42501', null, 'el personal no abre cierres');

-- Administrador de B: no llega a nada de A ------------------------------------

reset role;
select pg_temp.como('10000000-0000-4000-8000-00000000000b');
set local role authenticated;

select is_empty($$ select 1 from public.cierre where org_id = '20000000-0000-4000-8000-00000000000a' $$, 'B no ve cierres de A');
select is_empty($$ select 1 from public.recibo where org_id = '20000000-0000-4000-8000-00000000000a' $$, 'B no ve recibos de A');
select throws_ok(
  $$ insert into public.partida (org_id, cierre_id, concepto, monto)
     values ('20000000-0000-4000-8000-00000000000a', (select id from ids where clave = 'cierre_a_oct'), 'Intruso', 1) $$,
  '42501', null, 'B no agrega partidas a un cierre de A');
select results_eq(
  $$ with x as (update public.lectura set actual = 1 where org_id = '20000000-0000-4000-8000-00000000000a' returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$, 'B no modifica lecturas de A');

select * from finish();
rollback;
