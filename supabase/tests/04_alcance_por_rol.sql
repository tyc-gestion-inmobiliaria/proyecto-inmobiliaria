-- Alcance de cada rol dentro de una misma administradora (PB-04).
--
-- El administrador lee y escribe todo; el personal lee todo y no escribe; el
-- residente ve solo lo suyo: su membresía, su ficha, sus vínculos, sus
-- unidades, los edificios de esas unidades y sus cuentas bancarias.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

-- Datos (como postgres, sin RLS) ----------------------------------------------

insert into auth.users (id, email) values
  ('11000000-0000-4000-8000-00000000000a', 'admin.r@prueba.test'),
  ('11000000-0000-4000-8000-0000000000a2', 'personal.r@prueba.test'),
  ('11000000-0000-4000-8000-0000000000a3', 'residente.r@prueba.test'),
  ('11000000-0000-4000-8000-0000000000a4', 'residente.sin.ficha@prueba.test');

insert into public.organizacion (id, nombre) values
  ('21000000-0000-4000-8000-00000000000a', 'Administradora de prueba R'),
  ('21000000-0000-4000-8000-00000000000b', 'Administradora de prueba S');

insert into public.membresia (org_id, usuario_id, rol) values
  ('21000000-0000-4000-8000-00000000000a', '11000000-0000-4000-8000-00000000000a', 'administrador'),
  ('21000000-0000-4000-8000-00000000000a', '11000000-0000-4000-8000-0000000000a2', 'personal'),
  ('21000000-0000-4000-8000-00000000000a', '11000000-0000-4000-8000-0000000000a3', 'residente'),
  ('21000000-0000-4000-8000-00000000000a', '11000000-0000-4000-8000-0000000000a4', 'residente');

insert into public.edificio (id, org_id, nombre) values
  ('31000000-0000-4000-8000-0000000000a1', '21000000-0000-4000-8000-00000000000a', 'Edificio R1'),
  ('31000000-0000-4000-8000-0000000000a2', '21000000-0000-4000-8000-00000000000a', 'Edificio R2'),
  ('31000000-0000-4000-8000-0000000000b1', '21000000-0000-4000-8000-00000000000b', 'Edificio S1');

insert into public.unidad (id, org_id, edificio_id, numero) values
  ('41000000-0000-4000-8000-0000000000a1', '21000000-0000-4000-8000-00000000000a', '31000000-0000-4000-8000-0000000000a1', '101'),
  ('41000000-0000-4000-8000-0000000000a2', '21000000-0000-4000-8000-00000000000a', '31000000-0000-4000-8000-0000000000a1', '102'),
  ('41000000-0000-4000-8000-0000000000a3', '21000000-0000-4000-8000-00000000000a', '31000000-0000-4000-8000-0000000000a2', '201'),
  ('41000000-0000-4000-8000-0000000000b1', '21000000-0000-4000-8000-00000000000b', '31000000-0000-4000-8000-0000000000b1', '101');

-- La residente tiene ficha en R (donde es miembro) y en S (donde no lo es).
insert into public.persona (id, org_id, nombre, usuario_id) values
  ('51000000-0000-4000-8000-0000000000a1', '21000000-0000-4000-8000-00000000000a', 'Residente R', '11000000-0000-4000-8000-0000000000a3'),
  ('51000000-0000-4000-8000-0000000000a2', '21000000-0000-4000-8000-00000000000a', 'Vecino R', null),
  ('51000000-0000-4000-8000-0000000000b1', '21000000-0000-4000-8000-00000000000b', 'Residente R en S', '11000000-0000-4000-8000-0000000000a3');

insert into public.unidad_persona (id, org_id, unidad_id, persona_id, relacion, responsable_pago) values
  ('61000000-0000-4000-8000-0000000000a1', '21000000-0000-4000-8000-00000000000a',
   '41000000-0000-4000-8000-0000000000a1', '51000000-0000-4000-8000-0000000000a1', 'propietario', true),
  ('61000000-0000-4000-8000-0000000000a2', '21000000-0000-4000-8000-00000000000a',
   '41000000-0000-4000-8000-0000000000a2', '51000000-0000-4000-8000-0000000000a2', 'inquilino', true),
  ('61000000-0000-4000-8000-0000000000b1', '21000000-0000-4000-8000-00000000000b',
   '41000000-0000-4000-8000-0000000000b1', '51000000-0000-4000-8000-0000000000b1', 'propietario', true);

insert into public.cuenta_bancaria (id, org_id, edificio_id, nombre, banco, numero) values
  ('71000000-0000-4000-8000-0000000000a1', '21000000-0000-4000-8000-00000000000a',
   '31000000-0000-4000-8000-0000000000a1', 'Cuenta principal', 'Banco de prueba', '000-0000011'),
  ('71000000-0000-4000-8000-0000000000a2', '21000000-0000-4000-8000-00000000000a',
   '31000000-0000-4000-8000-0000000000a2', 'Cuenta principal', 'Banco de prueba', '000-0000012');

create function pg_temp.como(p_usuario uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
$$;

-- Residente: solo lo suyo -----------------------------------------------------

select pg_temp.como('11000000-0000-4000-8000-0000000000a3');
set local role authenticated;

select results_eq($$ select id from public.organizacion $$,
  $$ values ('21000000-0000-4000-8000-00000000000a'::uuid) $$,
  'residente: ve su administradora y no la otra donde tiene ficha');
select results_eq($$ select usuario_id from public.membresia $$,
  $$ values ('11000000-0000-4000-8000-0000000000a3'::uuid) $$,
  'residente: ve solo su membresía, no las del equipo');
select results_eq($$ select id from public.persona $$,
  $$ values ('51000000-0000-4000-8000-0000000000a1'::uuid) $$,
  'residente: ve solo su ficha, no la de sus vecinos');
select results_eq($$ select id from public.unidad_persona $$,
  $$ values ('61000000-0000-4000-8000-0000000000a1'::uuid) $$,
  'residente: ve solo sus vínculos');
select results_eq($$ select id from public.unidad $$,
  $$ values ('41000000-0000-4000-8000-0000000000a1'::uuid) $$,
  'residente: ve solo su unidad');
select results_eq($$ select id from public.edificio $$,
  $$ values ('31000000-0000-4000-8000-0000000000a1'::uuid) $$,
  'residente: ve solo el edificio de su unidad');
select results_eq($$ select id from public.cuenta_bancaria $$,
  $$ values ('71000000-0000-4000-8000-0000000000a1'::uuid) $$,
  'residente: ve solo la cuenta de su edificio');

select throws_ok(
  $$ insert into public.unidad_persona (org_id, unidad_id, persona_id, relacion)
     values ('21000000-0000-4000-8000-00000000000a', '41000000-0000-4000-8000-0000000000a2',
             '51000000-0000-4000-8000-0000000000a1', 'residente') $$,
  '42501', null,
  'residente: no puede vincularse a otra unidad');

select results_eq(
  $$ with x as (update public.persona set nombre = 'Cambiada' where id = '51000000-0000-4000-8000-0000000000a1' returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$,
  'residente: no edita su ficha (lo hace la administradora)');

-- Residente sin ficha: no ve el padrón ---------------------------------------

reset role;
select pg_temp.como('11000000-0000-4000-8000-0000000000a4');
set local role authenticated;

select is_empty($$ select 1 from public.unidad $$, 'residente sin ficha: no ve unidades');
select is_empty($$ select 1 from public.persona $$, 'residente sin ficha: no ve personas');

-- Personal: lee todo, no escribe -----------------------------------------------

reset role;
select pg_temp.como('11000000-0000-4000-8000-0000000000a2');
set local role authenticated;

select results_eq($$ select count(*)::int from public.persona $$, $$ values (2) $$,
  'personal: ve todas las personas de su administradora');
select throws_ok(
  $$ select public.elegir_responsable_pago('61000000-0000-4000-8000-0000000000a2') $$,
  '42501', null,
  'personal: no cambia el responsable de pago');
select results_eq(
  $$ with x as (update public.persona set nombre = 'Cambiada' where id = '51000000-0000-4000-8000-0000000000a2' returning 1)
     select count(*)::int from x $$,
  $$ values (0) $$,
  'personal: no edita personas');

-- Administrador: escribe -------------------------------------------------------

reset role;
select pg_temp.como('11000000-0000-4000-8000-00000000000a');
set local role authenticated;

select lives_ok(
  $$ insert into public.unidad_persona (org_id, unidad_id, persona_id, relacion)
     values ('21000000-0000-4000-8000-00000000000a', '41000000-0000-4000-8000-0000000000a3',
             '51000000-0000-4000-8000-0000000000a1', 'propietario') $$,
  'administrador: vincula personas a unidades');

insert into public.unidad_persona (id, org_id, unidad_id, persona_id, relacion)
values ('61000000-0000-4000-8000-0000000000a9', '21000000-0000-4000-8000-00000000000a',
        '41000000-0000-4000-8000-0000000000a2', '51000000-0000-4000-8000-0000000000a1', 'residente');
select lives_ok(
  $$ select public.elegir_responsable_pago('61000000-0000-4000-8000-0000000000a9') $$,
  'administrador: pasa el responsable de pago a otra persona de la unidad');
select results_eq(
  $$ select id from public.unidad_persona
     where unidad_id = '41000000-0000-4000-8000-0000000000a2' and responsable_pago $$,
  $$ values ('61000000-0000-4000-8000-0000000000a9'::uuid) $$,
  'la unidad sigue con un solo responsable de pago, el nuevo');

-- Membresía desactivada: el residente deja de ver su unidad -------------------

reset role;
update public.membresia set activa = false where usuario_id = '11000000-0000-4000-8000-0000000000a3';
select pg_temp.como('11000000-0000-4000-8000-0000000000a3');
set local role authenticated;

select is_empty($$ select 1 from public.unidad $$, 'residente con la membresía desactivada: no ve su unidad');

select * from finish();
rollback;
