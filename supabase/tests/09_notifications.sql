-- Notificaciones: la bandeja de salida (PB-30).
--
-- Emitir encola un correo por responsable de pago, y deja a la vista lo que
-- no se puede mandar (sin correo, sin responsable); validar o rechazar un
-- pago reportado encola el aviso a quien lo reportó, una sola vez aunque se
-- revierta y se vuelva a aceptar. La bandeja la lee solo el administrador de
-- esa administradora y nadie escribe en ella desde la API.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- Datos (como postgres, sin RLS) ----------------------------------------------

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-00000000000a', 'admin.a@prueba.test'),
  ('10000000-0000-4000-8000-0000000000a3', 'residente.a@prueba.test'),
  ('10000000-0000-4000-8000-00000000000b', 'admin.b@prueba.test');

insert into public.organizacion (id, nombre) values
  ('20000000-0000-4000-8000-00000000000a', 'Administradora de prueba A'),
  ('20000000-0000-4000-8000-00000000000b', 'Administradora de prueba B');

insert into public.membresia (org_id, usuario_id, rol) values
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'administrador'),
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-0000000000a3', 'residente'),
  ('20000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b', 'administrador');

insert into public.edificio (id, org_id, nombre) values
  ('30000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', 'Edificio A');

insert into public.unidad (id, org_id, edificio_id, numero, participacion) values
  ('40000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '101', 50),
  ('40000000-0000-4000-8000-000000000102', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '102', 30),
  ('40000000-0000-4000-8000-000000000103', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '103', 20);

insert into public.persona (id, org_id, nombre, correo, usuario_id) values
  ('50000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-00000000000a', 'Residente A', 'residente.a@prueba.test', '10000000-0000-4000-8000-0000000000a3'),
  ('50000000-0000-4000-8000-000000000102', '20000000-0000-4000-8000-00000000000a', 'Propietario sin correo', null, null);

-- La 101 y la 102 tienen responsable; la 103, no.
insert into public.unidad_persona (org_id, unidad_id, persona_id, relacion, responsable_pago) values
  ('20000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-000000000101', '50000000-0000-4000-8000-000000000101', 'propietario', true),
  ('20000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-000000000102', '50000000-0000-4000-8000-000000000102', 'propietario', true);

insert into public.cuenta_bancaria (id, org_id, edificio_id, nombre, banco, numero) values
  ('70000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', 'Cuenta principal', 'Banco de prueba', '000-0000001');

insert into public.cierre (id, org_id, edificio_id, periodo, estado, paso, vence, emitido_en) values
  ('80000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '2026-10-01', 'emitido', 4, '2026-10-28', now());

-- Emitir: un recibo por unidad (como lo haría emitir_cierre).
insert into public.recibo (id, org_id, cierre_id, edificio_id, unidad_id, numero, periodo, unidad_numero, participacion, cuota, agua, deuda_previa, total, vence) values
  ('90000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-00000000000a', '80000000-0000-4000-8000-000000000010',
   '30000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-000000000101', 1, '2026-10-01', '101', 50, 100, 20, 0, 120, '2026-10-28'),
  ('90000000-0000-4000-8000-000000000102', '20000000-0000-4000-8000-00000000000a', '80000000-0000-4000-8000-000000000010',
   '30000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-000000000102', 2, '2026-10-01', '102', 30, 60, 0, 0, 60, '2026-10-28'),
  ('90000000-0000-4000-8000-000000000103', '20000000-0000-4000-8000-00000000000a', '80000000-0000-4000-8000-000000000010',
   '30000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-000000000103', 3, '2026-10-01', '103', 20, 40, 0, 0, 40, '2026-10-28');

-- Recibos: uno por responsable ------------------------------------------------

select results_eq(
  $$ select estado, correo from public.envio where recibo_id = '90000000-0000-4000-8000-000000000101' $$,
  $$ values ('pendiente', 'residente.a@prueba.test') $$,
  'el responsable con correo queda en la bandeja para enviar'
);

select is(
  (select (datos ->> 'total')::numeric from public.envio where recibo_id = '90000000-0000-4000-8000-000000000101'),
  120.00,
  'el correo lleva el total del recibo'
);

select results_eq(
  $$ select estado, ultimo_error from public.envio where recibo_id = '90000000-0000-4000-8000-000000000102' $$,
  $$ values ('sin_correo', 'El responsable de pago no tiene correo') $$,
  'sin correo, queda a la vista con el motivo'
);

select results_eq(
  $$ select estado, ultimo_error from public.envio where recibo_id = '90000000-0000-4000-8000-000000000103' $$,
  $$ values ('sin_correo', 'La unidad no tiene responsable de pago') $$,
  'sin responsable de pago, también'
);

-- Pagos: el aviso a quien reportó ---------------------------------------------

create function pg_temp.como(p_usuario uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
$$;

create temp table ids (clave text primary key, id uuid);
grant all on ids to authenticated;

select pg_temp.como('10000000-0000-4000-8000-0000000000a3');
set local role authenticated;
insert into ids values ('bueno', public.reportar_pago('40000000-0000-4000-8000-000000000101', 120, '2026-10-20', 'OP-1',
  '70000000-0000-4000-8000-00000000000a', null, 'b0000000-0000-4000-8000-000000000001'));
insert into ids values ('malo', public.reportar_pago('40000000-0000-4000-8000-000000000101', 50, '2026-10-20', 'OP-2',
  '70000000-0000-4000-8000-00000000000a', null, 'b0000000-0000-4000-8000-000000000002'));

reset role;
select pg_temp.como('10000000-0000-4000-8000-00000000000a');
set local role authenticated;
select public.aceptar_pago((select id from ids where clave = 'bueno'));
select public.rechazar_pago((select id from ids where clave = 'malo'), 'La operación no aparece en el banco');

select results_eq(
  $$ select tipo, estado, correo from public.envio where pago_id = (select id from ids where clave = 'bueno') $$,
  $$ values ('pago_validado', 'pendiente', 'residente.a@prueba.test') $$,
  'validar un pago reportado avisa a quien lo reportó'
);

select is(
  (select datos ->> 'motivo' from public.envio where pago_id = (select id from ids where clave = 'malo')),
  'La operación no aparece en el banco',
  'el aviso de rechazo lleva el motivo'
);

select public.revertir_pago((select id from ids where clave = 'bueno'));
select public.aceptar_pago((select id from ids where clave = 'bueno'));

select is(
  (select count(*)::int from public.envio where pago_id = (select id from ids where clave = 'bueno')),
  1,
  'revertir y volver a aceptar no manda un segundo aviso'
);

select is((select count(*)::int from public.envio), 5, 'el administrador de A ve la bandeja de su administradora');

select throws_ok(
  $$ insert into public.envio (org_id, tipo, recibo_id, correo, asunto)
     values ('20000000-0000-4000-8000-00000000000a', 'recibo', '90000000-0000-4000-8000-000000000103', 'x@prueba.test', 'x') $$,
  '42501', null,
  'desde la API no se encola nada'
);

select throws_ok(
  $$ update public.envio set estado = 'enviado', enviado_en = now() $$,
  '42501', null,
  'desde la API no se marca nada como enviado'
);

-- Otros no la ven -------------------------------------------------------------

reset role;
select pg_temp.como('10000000-0000-4000-8000-00000000000b');
set local role authenticated;
select is_empty($$ select 1 from public.envio $$, 'el administrador de B no ve la bandeja de A');

reset role;
select pg_temp.como('10000000-0000-4000-8000-0000000000a3');
set local role authenticated;
select is_empty($$ select 1 from public.envio $$, 'el residente no ve la bandeja');

select * from finish();
rollback;
