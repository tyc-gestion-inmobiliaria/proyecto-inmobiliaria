-- Cobranza: el personal toma las lecturas en el edificio (PB-29).
--
-- El personal carga la lectura actual y la foto de un cierre en borrador de
-- su administradora; no toca la anterior, ni un cierre emitido, ni otra
-- administradora; el residente no escribe. La base anota quién la tomó.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- Datos (como postgres, sin RLS) ----------------------------------------------

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-00000000000a', 'admin.a@prueba.test'),
  ('10000000-0000-4000-8000-0000000000a2', 'personal.a@prueba.test'),
  ('10000000-0000-4000-8000-0000000000a3', 'residente.a@prueba.test'),
  ('10000000-0000-4000-8000-0000000000b2', 'personal.b@prueba.test');

insert into public.organizacion (id, nombre) values
  ('20000000-0000-4000-8000-00000000000a', 'Administradora de prueba A'),
  ('20000000-0000-4000-8000-00000000000b', 'Administradora de prueba B');

insert into public.membresia (org_id, usuario_id, rol) values
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'administrador'),
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-0000000000a2', 'personal'),
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-0000000000a3', 'residente'),
  ('20000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-0000000000b2', 'personal');

insert into public.edificio (id, org_id, nombre) values
  ('30000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', 'Edificio A');

insert into public.unidad (id, org_id, edificio_id, numero, participacion) values
  ('40000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '101', 100);

insert into public.cierre (id, org_id, edificio_id, periodo) values
  ('50000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', '2026-10-01');

insert into public.lectura (id, org_id, cierre_id, unidad_id, anterior) values
  ('60000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a',
   '50000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-000000000101', 100);

create function pg_temp.como(p_usuario uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
$$;

-- Personal de A --------------------------------------------------------------

select pg_temp.como('10000000-0000-4000-8000-0000000000a2');
set local role authenticated;

select results_eq(
  $$ with x as (update public.lectura set actual = 112, foto = 'a/b/c.jpg'
                where id = '60000000-0000-4000-8000-00000000000a' returning 1) select count(*)::int from x $$,
  $$ values (1) $$,
  'el personal carga la lectura actual y la foto'
);

select is(
  (select tomada_por from public.lectura where id = '60000000-0000-4000-8000-00000000000a'),
  '10000000-0000-4000-8000-0000000000a2'::uuid,
  'la lectura dice quién la tomó'
);

select isnt((select tomada_en from public.lectura where id = '60000000-0000-4000-8000-00000000000a'), null, 'y cuándo');

select throws_ok(
  $$ update public.lectura set anterior = 90 where id = '60000000-0000-4000-8000-00000000000a' $$,
  '42501', null,
  'el personal no cambia la lectura anterior'
);

select throws_ok(
  $$ update public.lectura set actual = 80 where id = '60000000-0000-4000-8000-00000000000a' $$,
  '23514', null,
  'tampoco para el personal la lectura baja de la anterior'
);

-- Residente de A y personal de B: no escriben -------------------------------

reset role;
select pg_temp.como('10000000-0000-4000-8000-0000000000a3');
set local role authenticated;

select is_empty(
  $$ update public.lectura set actual = 120 where id = '60000000-0000-4000-8000-00000000000a' returning 1 $$,
  'el residente no carga lecturas'
);

reset role;
select pg_temp.como('10000000-0000-4000-8000-0000000000b2');
set local role authenticated;

select is_empty(
  $$ update public.lectura set actual = 120 where id = '60000000-0000-4000-8000-00000000000a' returning 1 $$,
  'el personal de otra administradora no carga lecturas'
);

-- Cierre emitido: ya no se toca ---------------------------------------------

reset role;
update public.cierre set estado = 'emitido', emitido_en = now(), vence = '2026-10-28' where id = '50000000-0000-4000-8000-00000000000a';
select pg_temp.como('10000000-0000-4000-8000-0000000000a2');
set local role authenticated;

select is_empty(
  $$ update public.lectura set actual = 130 where id = '60000000-0000-4000-8000-00000000000a' returning 1 $$,
  'con el cierre emitido, el personal ya no cambia la lectura'
);

reset role;
select is((select actual from public.lectura where id = '60000000-0000-4000-8000-00000000000a'), 112.000, 'la lectura quedó como la cargó el personal');

select * from finish();
rollback;
