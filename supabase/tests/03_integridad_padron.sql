-- Reglas de integridad del padrón que viven en la base (PB-06).
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

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

delete from public.organizacion where id = '20000000-0000-4000-8000-0000000000c1';

select is_empty(
  $$ select 1 from public.unidad where org_id = '20000000-0000-4000-8000-0000000000c1' $$,
  'borrar una administradora borra su padrón'
);

select * from finish();
rollback;
