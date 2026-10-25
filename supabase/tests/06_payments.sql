-- Pagos: reportar, registrar, aceptar, rechazar y revertir (PB-26 a PB-28).
--
-- Las transiciones con su rol y su estado anterior, el doble clic en cada una,
-- la aplicación al recibo más antiguo primero, el saldo del recibo y de la
-- unidad que sale de lo aplicado, la deuda previa del cierre siguiente, el
-- aislamiento de pago_aplicacion y los comprobantes en Storage.
begin;
create extension if not exists pgtap with schema extensions;

select plan(54);

-- Datos (como postgres, sin RLS) ----------------------------------------------

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-00000000000a', 'admin.a@prueba.test'),
  ('10000000-0000-4000-8000-00000000000b', 'admin.b@prueba.test'),
  ('10000000-0000-4000-8000-0000000000a2', 'personal.a@prueba.test'),
  ('10000000-0000-4000-8000-0000000000a3', 'residente.a@prueba.test');

insert into public.organizacion (id, nombre) values
  ('20000000-0000-4000-8000-00000000000a', 'Administradora de prueba A'),
  ('20000000-0000-4000-8000-00000000000b', 'Administradora de prueba B');

insert into public.membresia (org_id, usuario_id, rol) values
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'administrador'),
  ('20000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b', 'administrador'),
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-0000000000a2', 'personal'),
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-0000000000a3', 'residente');

insert into public.edificio (id, org_id, nombre) values
  ('30000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', 'Edificio A'),
  ('30000000-0000-4000-8000-0000000000a2', '20000000-0000-4000-8000-00000000000a', 'Edificio A2'),
  ('30000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', 'Edificio B');

insert into public.unidad (id, org_id, edificio_id, numero, participacion) values
  ('40000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '101', 60),
  ('40000000-0000-4000-8000-000000000102', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '102', 40),
  ('40000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', '101', 100);

insert into public.persona (id, org_id, nombre, usuario_id) values
  ('50000000-0000-4000-8000-0000000000a3', '20000000-0000-4000-8000-00000000000a', 'Residente A', '10000000-0000-4000-8000-0000000000a3');

insert into public.unidad_persona (org_id, unidad_id, persona_id, relacion, responsable_pago) values
  ('20000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-000000000101', '50000000-0000-4000-8000-0000000000a3', 'propietario', true);

insert into public.cuenta_bancaria (id, org_id, edificio_id, nombre, banco, numero) values
  ('70000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', 'Cuenta principal', 'Banco de prueba', '000-0000001'),
  ('70000000-0000-4000-8000-0000000000a2', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-0000000000a2', 'Cuenta A2', 'Banco de prueba', '000-0000003'),
  ('70000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', 'Cuenta principal', 'Banco de prueba', '000-0000002');

-- Dos meses emitidos en A: la 101 debe 120 (septiembre) y 130 (octubre); la 102, 80.
insert into public.cierre (id, org_id, edificio_id, periodo, estado, paso, vence, emitido_en) values
  ('80000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '2026-09-01', 'emitido', 4, '2026-10-15', now()),
  ('80000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '2026-10-01', 'emitido', 4, '2026-11-15', now()),
  ('80000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', '2026-09-01', 'emitido', 4, '2026-10-15', now());

insert into public.recibo (id, org_id, cierre_id, edificio_id, unidad_id, numero, periodo, unidad_numero, participacion, cuota, agua, deuda_previa, total, vence) values
  ('90000000-0000-4000-8000-000000000901', '20000000-0000-4000-8000-00000000000a', '80000000-0000-4000-8000-000000000009',
   '30000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-000000000101', 1, '2026-09-01', '101', 60, 100, 20, 0, 120, '2026-10-15'),
  ('90000000-0000-4000-8000-000000000902', '20000000-0000-4000-8000-00000000000a', '80000000-0000-4000-8000-000000000009',
   '30000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-000000000102', 2, '2026-09-01', '102', 40, 80, 0, 0, 80, '2026-10-15'),
  ('90000000-0000-4000-8000-000000001001', '20000000-0000-4000-8000-00000000000a', '80000000-0000-4000-8000-000000000010',
   '30000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-000000000101', 3, '2026-10-01', '101', 60, 100, 30, 120, 250, '2026-11-15'),
  ('90000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', '80000000-0000-4000-8000-00000000000b',
   '30000000-0000-4000-8000-00000000000b', '40000000-0000-4000-8000-00000000000b', 1, '2026-09-01', '101', 100, 50, 0, 0, 50, '2026-10-15');

-- Un pago aceptado y aplicado en B, para el aislamiento.
insert into public.pago (id, org_id, edificio_id, unidad_id, monto, fecha, origen, estado, clave, validado_en) values
  ('a0000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b',
   '40000000-0000-4000-8000-00000000000b', 50, '2026-10-01', 'registrado', 'aceptado', gen_random_uuid(), now());
insert into public.pago_aplicacion (org_id, pago_id, recibo_id, monto) values
  ('20000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-00000000000b', '90000000-0000-4000-8000-00000000000b', 50);

create function pg_temp.como(p_usuario uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
$$;

create temp table ids (clave text primary key, id uuid);
grant all on ids to authenticated;

-- Residente de A: reporta para su unidad --------------------------------------

select pg_temp.como('10000000-0000-4000-8000-0000000000a3');
set local role authenticated;

insert into ids values ('reporte', public.reportar_pago(
  '40000000-0000-4000-8000-000000000101', 150, '2026-10-20', 'OP-123', '70000000-0000-4000-8000-00000000000a',
  '20000000-0000-4000-8000-00000000000a/40000000-0000-4000-8000-000000000101/b0000000-0000-4000-8000-000000000001.jpg',
  'b0000000-0000-4000-8000-000000000001'));

select is((select estado from public.pago where id = (select id from ids where clave = 'reporte')), 'por_validar',
  'el pago reportado queda por validar');
select is((select origen from public.pago where id = (select id from ids where clave = 'reporte')), 'reportado',
  'el pago del residente es reportado');
select is(
  public.reportar_pago('40000000-0000-4000-8000-000000000101', 150, '2026-10-20', 'OP-123', '70000000-0000-4000-8000-00000000000a',
    null, 'b0000000-0000-4000-8000-000000000001'),
  (select id from ids where clave = 'reporte'),
  'reintentar con la misma clave devuelve el mismo pago');
select is((select count(*)::int from public.pago), 1, 'el reintento no duplica el pago');

select throws_ok(
  $$ select public.reportar_pago('40000000-0000-4000-8000-000000000102', 80, '2026-10-20', 'OP-9', '70000000-0000-4000-8000-00000000000a',
       null, gen_random_uuid()) $$,
  '42501', null, 'el residente no reporta para una unidad que no es suya');
select throws_ok(
  $$ select public.reportar_pago('40000000-0000-4000-8000-00000000000b', 50, '2026-10-20', 'OP-9', '70000000-0000-4000-8000-00000000000b',
       null, gen_random_uuid()) $$,
  '42501', null, 'el residente no reporta para una unidad de otra administradora');
select throws_ok(
  $$ select public.reportar_pago('40000000-0000-4000-8000-000000000101', 50, '2026-10-20', '  ', '70000000-0000-4000-8000-00000000000a',
       null, gen_random_uuid()) $$,
  '22023', 'Falta el número de operación', 'reportar pide el número de operación');
select throws_ok(
  $$ select public.reportar_pago('40000000-0000-4000-8000-000000000101', 50, current_date + 5, 'OP-1', '70000000-0000-4000-8000-00000000000a',
       null, gen_random_uuid()) $$,
  '22023', 'La fecha no puede ser posterior a hoy', 'la fecha del pago no puede ser futura');
select throws_ok(
  $$ select public.reportar_pago('40000000-0000-4000-8000-000000000101', 0, '2026-10-20', 'OP-1', '70000000-0000-4000-8000-00000000000a',
       null, gen_random_uuid()) $$,
  '22023', null, 'el monto tiene que ser mayor que cero');
select throws_ok(
  $$ select public.reportar_pago('40000000-0000-4000-8000-000000000101', 10, '2026-10-20', 'OP-1', '70000000-0000-4000-8000-0000000000a2',
       null, gen_random_uuid()) $$,
  '22023', 'La cuenta no es del edificio de la unidad', 'la cuenta tiene que ser del edificio de la unidad');
select throws_ok(
  $$ select public.reportar_pago('40000000-0000-4000-8000-000000000101', 10, '2026-10-20', 'OP-1', '70000000-0000-4000-8000-00000000000a',
       '20000000-0000-4000-8000-00000000000a/40000000-0000-4000-8000-000000000102/x.jpg', gen_random_uuid()) $$,
  '22023', 'El comprobante no es de esta unidad', 'el comprobante tiene que estar en la carpeta de la unidad');
select throws_ok(
  $$ insert into public.pago (org_id, edificio_id, unidad_id, monto, fecha, origen, estado, clave, validado_en)
     values ('20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-000000000101',
             999, '2026-10-20', 'reportado', 'aceptado', gen_random_uuid(), now()) $$,
  '42501', null, 'el residente no escribe en pago directo');
select throws_ok(
  $$ select public.aceptar_pago((select id from ids where clave = 'reporte')) $$,
  '42501', null, 'el residente no acepta su propio pago');

-- Comprobantes en Storage ------------------------------------------------------

select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('comprobantes', '20000000-0000-4000-8000-00000000000a/40000000-0000-4000-8000-000000000101/b0000000-0000-4000-8000-000000000001.jpg') $$,
  'el residente sube el comprobante a la carpeta de su unidad');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('comprobantes', '20000000-0000-4000-8000-00000000000a/40000000-0000-4000-8000-000000000102/x.jpg') $$,
  '42501', null, 'el residente no sube a la carpeta de otra unidad');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('comprobantes', '20000000-0000-4000-8000-00000000000b/40000000-0000-4000-8000-000000000101/x.jpg') $$,
  '42501', null, 'el residente no sube con su unidad bajo otra administradora');
select is((select count(*)::int from storage.objects where bucket_id = 'comprobantes'), 1, 'el residente ve su comprobante');

-- Administrador de A: acepta, revierte, rechaza --------------------------------

reset role;
select pg_temp.como('10000000-0000-4000-8000-00000000000a');
set local role authenticated;

select is((select count(*)::int from storage.objects where bucket_id = 'comprobantes'), 1, 'el equipo lee los comprobantes de su administradora');

select is(public.aceptar_pago((select id from ids where clave = 'reporte')), 'aceptado', 'aceptar deja el pago aceptado');
select results_eq(
  $$ select r.periodo, pa.monto from public.pago_aplicacion pa join public.recibo r on r.id = pa.recibo_id
     where pa.pago_id = (select id from ids where clave = 'reporte') order by r.periodo $$,
  $$ values ('2026-09-01'::date, 120.00::numeric), ('2026-10-01'::date, 30.00::numeric) $$,
  'se aplica al recibo más antiguo primero');
select is(public.aceptar_pago((select id from ids where clave = 'reporte')), 'aceptado', 'aceptar dos veces no falla');
select is((select sum(monto) from public.pago_aplicacion where pago_id = (select id from ids where clave = 'reporte')), 150.00::numeric,
  'aceptar dos veces no aplica dos veces');
select is((select validado_por from public.pago where id = (select id from ids where clave = 'reporte')),
  '10000000-0000-4000-8000-00000000000a'::uuid, 'queda quién lo validó');
select results_eq(
  $$ select periodo, pendiente from public.recibo_con_saldo where unidad_id = '40000000-0000-4000-8000-000000000101' order by periodo $$,
  $$ values ('2026-09-01'::date, 0.00::numeric), ('2026-10-01'::date, 100.00::numeric) $$,
  'el recibo muestra lo que le falta después de aplicar');
select is((select saldo from public.saldo_de_la_unidad where unidad_id = '40000000-0000-4000-8000-000000000101'), 100.00::numeric,
  'el saldo de la unidad descuenta lo pagado');

select is(public.revertir_pago((select id from ids where clave = 'reporte')), 'por_validar', 'revertir vuelve el pago a por validar');
select is(public.revertir_pago((select id from ids where clave = 'reporte')), 'por_validar', 'revertir dos veces no falla');
select is((select count(*)::int from public.pago_aplicacion where pago_id = (select id from ids where clave = 'reporte')), 0,
  'revertir quita las aplicaciones');
select is((select saldo from public.saldo_de_la_unidad where unidad_id = '40000000-0000-4000-8000-000000000101'), 250.00::numeric,
  'después de revertir la unidad vuelve a deber todo');
select is((select por_validar from public.saldo_de_la_unidad where unidad_id = '40000000-0000-4000-8000-000000000101'), 150.00::numeric,
  'el saldo dice cuánto espera validación');

select throws_ok(
  $$ select public.rechazar_pago((select id from ids where clave = 'reporte'), '   ') $$,
  '22023', 'Escribe el motivo del rechazo', 'rechazar sin motivo no se puede');
select is(public.rechazar_pago((select id from ids where clave = 'reporte'), 'La operación no aparece en el banco'), 'rechazado',
  'rechazar con motivo deja el pago rechazado');
select is(public.rechazar_pago((select id from ids where clave = 'reporte'), 'otra vez'), 'rechazado', 'rechazar dos veces no falla');
select is((select motivo_rechazo from public.pago where id = (select id from ids where clave = 'reporte')), 'La operación no aparece en el banco',
  'el segundo rechazo no pisa el motivo');
select throws_ok(
  $$ select public.aceptar_pago((select id from ids where clave = 'reporte')) $$,
  'P0001', 'El pago ya se rechazó', 'un pago rechazado no se acepta');
select throws_ok(
  $$ select public.revertir_pago((select id from ids where clave = 'reporte')) $$,
  'P0001', 'Un pago rechazado no se revierte', 'un pago rechazado no se revierte');

-- Registrar desde la ficha -----------------------------------------------------

insert into ids values ('oficina', public.registrar_pago(
  '40000000-0000-4000-8000-000000000102', 100, '2026-10-21', null, null, null, 'b0000000-0000-4000-8000-000000000002'));
select is((select estado from public.pago where id = (select id from ids where clave = 'oficina')), 'aceptado',
  'el pago registrado queda aceptado');
select is((select sum(monto) from public.pago_aplicacion where pago_id = (select id from ids where clave = 'oficina')), 80.00::numeric,
  'se aplica solo lo que se debe');
select is((select saldo from public.saldo_de_la_unidad where unidad_id = '40000000-0000-4000-8000-000000000102'), -20.00::numeric,
  'lo que sobra queda a favor');
select is(public.registrar_pago('40000000-0000-4000-8000-000000000102', 100, '2026-10-21', null, null, null, 'b0000000-0000-4000-8000-000000000002'),
  (select id from ids where clave = 'oficina'), 'registrar dos veces devuelve el mismo pago');
select is((select count(*)::int from public.pago where unidad_id = '40000000-0000-4000-8000-000000000102'), 1, 'registrar dos veces no duplica');
select throws_ok(
  $$ select public.registrar_pago('40000000-0000-4000-8000-000000000101', 10, '2026-10-21', null, null, null, 'b0000000-0000-4000-8000-000000000002') $$,
  '22023', 'La clave ya se usó para otro pago', 'una clave no sirve para dos unidades');
select throws_ok(
  $$ select public.registrar_pago('40000000-0000-4000-8000-000000000101', 10, '2026-10-21', 'OP-1', '70000000-0000-4000-8000-00000000000b', null, gen_random_uuid()) $$,
  '22023', null, 'registrar con una cuenta de otra administradora no se puede');

-- El cierre siguiente: la deuda previa descuenta lo aplicado --------------------

insert into ids values ('pago_50', public.registrar_pago(
  '40000000-0000-4000-8000-000000000101', 50, '2026-10-22', 'OP-50', '70000000-0000-4000-8000-00000000000a', null, gen_random_uuid()));
insert into ids values ('cierre_nov', public.abrir_cierre('30000000-0000-4000-8000-00000000000a', '2026-11-01'));
select is((select deuda_previa from public.recibos_del_cierre((select id from ids where clave = 'cierre_nov')) where unidad_numero = '101'),
  200.00::numeric, 'la deuda previa del mes siguiente descuenta lo pagado');
select is((select deuda_previa from public.recibos_del_cierre((select id from ids where clave = 'cierre_nov')) where unidad_numero = '102'),
  0.00::numeric, 'una unidad al día no arrastra deuda');

select is_empty($$ select 1 from public.pago_aplicacion where org_id = '20000000-0000-4000-8000-00000000000b' $$,
  'pago_aplicacion: A no ve las aplicaciones de B');

-- Personal de A: ve, no valida -------------------------------------------------

reset role;
select pg_temp.como('10000000-0000-4000-8000-0000000000a2');
set local role authenticated;

select is((select count(*)::int from public.pago), 3, 'el personal ve los pagos de su administradora');
select throws_ok(
  $$ select public.revertir_pago((select id from ids where clave = 'oficina')) $$,
  '42501', null, 'el personal no revierte pagos');
select throws_ok(
  $$ select public.registrar_pago('40000000-0000-4000-8000-000000000101', 10, '2026-10-21', null, null, null, gen_random_uuid()) $$,
  '42501', null, 'el personal no registra pagos');

-- Administrador de B: no llega a nada de A -------------------------------------

reset role;
select pg_temp.como('10000000-0000-4000-8000-00000000000b');
set local role authenticated;

select throws_ok(
  $$ select public.aceptar_pago((select id from ids where clave = 'reporte')) $$,
  '42501', null, 'B no valida pagos de A');
select throws_ok(
  $$ select public.registrar_pago('40000000-0000-4000-8000-000000000101', 10, '2026-10-21', null, null, null, gen_random_uuid()) $$,
  '42501', null, 'B no registra pagos en unidades de A');
select is_empty($$ select 1 from storage.objects where bucket_id = 'comprobantes' $$, 'B no ve los comprobantes de A');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('comprobantes', '20000000-0000-4000-8000-00000000000a/40000000-0000-4000-8000-000000000101/y.jpg') $$,
  '42501', null, 'B no sube comprobantes a la carpeta de A');
select throws_ok(
  $$ insert into public.pago_aplicacion (org_id, pago_id, recibo_id, monto)
     values ('20000000-0000-4000-8000-00000000000a', (select id from ids where clave = 'oficina'), '90000000-0000-4000-8000-000000000902', 1) $$,
  '42501', null, 'pago_aplicacion: B no inserta en A');

select * from finish();
rollback;
