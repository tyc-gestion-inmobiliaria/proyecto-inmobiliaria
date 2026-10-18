-- Reglas de integridad del padrón que viven en la base (PB-06).
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-0000000000c1', 'usuario.c@prueba.test');

insert into public.organizacion (id, nombre) values
  ('20000000-0000-4000-8000-0000000000c1', 'Administradora de prueba C');

insert into public.edificio (id, org_id, nombre) values
  ('30000000-0000-4000-8000-0000000000c1', '20000000-0000-4000-8000-0000000000c1', 'Edificio C1'),
  ('30000000-0000-4000-8000-0000000000c2', '20000000-0000-4000-8000-0000000000c1', 'Edificio C2');

insert into public.unidad (org_id, edificio_id, numero) values
  ('20000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-0000000000c1', '101');

select throws_ok(
  $$ insert into public.unidad (org_id, edificio_id, numero)
     values ('20000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-0000000000c1', '101') $$,
  '23505', null,
  'el número de unidad no se repite en el mismo edificio'
);

select lives_ok(
  $$ insert into public.unidad (org_id, edificio_id, numero)
     values ('20000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-0000000000c2', '101') $$,
  'el mismo número sí puede existir en otro edificio'
);

select throws_ok(
  $$ insert into public.unidad (org_id, edificio_id, numero, participacion)
     values ('20000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-0000000000c1', '102', 120) $$,
  '23514', null,
  'la participación no pasa de 100'
);

select throws_ok(
  $$ insert into public.unidad (org_id, edificio_id, numero, area_m2)
     values ('20000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-0000000000c1', '103', 0) $$,
  '23514', null,
  'el área tiene que ser mayor que cero'
);

select throws_ok(
  $$ insert into public.membresia (org_id, usuario_id, rol)
     values ('20000000-0000-4000-8000-0000000000c1', '10000000-0000-4000-8000-0000000000c1', 'supervisor') $$,
  '23514', null,
  'solo se aceptan los roles conocidos'
);

-- Participación: suma 100 % por edificio, validable ---------------------------

select results_eq(
  $$ select unidades, sin_participacion, suma_cien from public.participacion_por_edificio
     where edificio_id = '30000000-0000-4000-8000-0000000000c1' $$,
  $$ values (1, 1, false) $$,
  'una unidad sin participación deja el edificio sin cuadrar'
);

update public.unidad set participacion = 60
where edificio_id = '30000000-0000-4000-8000-0000000000c1' and numero = '101';
insert into public.unidad (id, org_id, edificio_id, numero, participacion) values
  ('40000000-0000-4000-8000-0000000000c2', '20000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-0000000000c1', '102', 40);

select results_eq(
  $$ select total, diferencia, suma_cien from public.participacion_por_edificio
     where edificio_id = '30000000-0000-4000-8000-0000000000c1' $$,
  $$ values (100.0000::numeric(9, 4), 0.0000::numeric(9, 4), true) $$,
  '60 % y 40 % suman 100 %'
);

update public.unidad set participacion = 30 where id = '40000000-0000-4000-8000-0000000000c2';

select results_eq(
  $$ select diferencia, suma_cien from public.participacion_por_edificio
     where edificio_id = '30000000-0000-4000-8000-0000000000c1' $$,
  $$ values (10.0000::numeric(9, 4), false) $$,
  'si falta participación se ve la diferencia'
);

-- Persona y vínculo -------------------------------------------------------------

insert into public.persona (id, org_id, nombre, documento_tipo, documento_numero) values
  ('50000000-0000-4000-8000-0000000000c1', '20000000-0000-4000-8000-0000000000c1', 'Persona C1', 'dni', '00000001'),
  ('50000000-0000-4000-8000-0000000000c2', '20000000-0000-4000-8000-0000000000c1', 'Persona C2', null, null);

select throws_ok(
  $$ insert into public.persona (org_id, nombre, documento_tipo, documento_numero)
     values ('20000000-0000-4000-8000-0000000000c1', 'Otra', 'dni', '00000001') $$,
  '23505', null,
  'el documento no se repite dentro de la administradora'
);

select throws_ok(
  $$ insert into public.persona (org_id, nombre, documento_tipo) values ('20000000-0000-4000-8000-0000000000c1', 'Sin número', 'dni') $$,
  '23514', null,
  'el tipo de documento no va sin su número'
);

insert into public.unidad_persona (org_id, unidad_id, persona_id, relacion, responsable_pago) values
  ('20000000-0000-4000-8000-0000000000c1', '40000000-0000-4000-8000-0000000000c2', '50000000-0000-4000-8000-0000000000c1', 'propietario', true);

select throws_ok(
  $$ insert into public.unidad_persona (org_id, unidad_id, persona_id, relacion)
     values ('20000000-0000-4000-8000-0000000000c1', '40000000-0000-4000-8000-0000000000c2', '50000000-0000-4000-8000-0000000000c2', 'dueño') $$,
  '23514', null,
  'el vínculo es propietario, inquilino o residente'
);

select throws_ok(
  $$ insert into public.unidad_persona (org_id, unidad_id, persona_id, relacion, responsable_pago)
     values ('20000000-0000-4000-8000-0000000000c1', '40000000-0000-4000-8000-0000000000c2', '50000000-0000-4000-8000-0000000000c2', 'inquilino', true) $$,
  '23505', null,
  'una unidad tiene un solo responsable de pago'
);

select throws_ok(
  $$ insert into public.unidad_persona (org_id, unidad_id, persona_id, relacion)
     values ('20000000-0000-4000-8000-0000000000c1', '40000000-0000-4000-8000-0000000000c2', '50000000-0000-4000-8000-0000000000c1', 'residente') $$,
  '23505', null,
  'una persona tiene un solo vínculo con cada unidad'
);

select throws_ok(
  $$ insert into public.cuenta_bancaria (org_id, edificio_id, nombre, banco, numero, cci)
     values ('20000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-0000000000c1', 'Cuenta principal', 'Banco', '000-0000001', '1234567890123456789') $$,
  '23514', null,
  'el CCI tiene 20 dígitos'
);

delete from public.unidad where id = '40000000-0000-4000-8000-0000000000c2';

select is_empty(
  $$ select 1 from public.unidad_persona where unidad_id = '40000000-0000-4000-8000-0000000000c2' $$,
  'borrar una unidad borra sus vínculos'
);

delete from public.organizacion where id = '20000000-0000-4000-8000-0000000000c1';

select is_empty(
  $$ select 1 from public.unidad where org_id = '20000000-0000-4000-8000-0000000000c1' $$,
  'borrar una administradora borra su padrón'
);

select is_empty(
  $$ select 1 from public.persona where org_id = '20000000-0000-4000-8000-0000000000c1' $$,
  'borrar una administradora borra sus personas'
);

select * from finish();
rollback;
