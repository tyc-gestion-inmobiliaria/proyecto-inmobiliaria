-- Red de seguridad del esquema: falla si una tabla nueva llega sin RLS, sin
-- políticas, sin org_id o sin su prueba de aislamiento (PB-12, Arquitectura
-- §11: "una tabla nueva queda sin RLS").
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

select is_empty(
  $$ select c.relname from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity $$,
  'todas las tablas de public tienen RLS activada'
);

select is_empty(
  $$ select c.relname from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p')
       and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) $$,
  'todas las tablas de public tienen al menos una política'
);

select is_empty(
  $$ select c.relname from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname <> 'organizacion'
       and not exists (
         select 1 from pg_attribute a
         where a.attrelid = c.oid and a.attname = 'org_id' and a.attnotnull and not a.attisdropped
       ) $$,
  'toda tabla de negocio lleva org_id not null'
);

-- Al agregar una tabla, se suma acá y se escribe su caso en 02_aislamiento.sql
-- (las de cobranza tienen el suyo en 05_cobranza.sql).
select set_eq(
  $$ select c.relname::text from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') $$,
  array['organizacion', 'membresia', 'edificio', 'unidad', 'persona', 'unidad_persona', 'cuenta_bancaria',
        'cierre', 'lectura', 'partida', 'recibo'],
  'cada tabla de public tiene su prueba de aislamiento'
);

-- Una política por operación: una tabla que permite escribir sin decir quién
-- puede hacerlo queda cerrada sin querer o, peor, abierta por un `for all`
-- mal escrito. organizacion no tiene alta ni baja desde la API (PB-04).
select is_empty(
  $$ select c.relname || ':' || op.cmd
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as op (cmd)
     where n.nspname = 'public' and c.relkind in ('r', 'p')
       and not (c.relname = 'organizacion' and op.cmd in ('INSERT', 'DELETE'))
       and not exists (
         select 1 from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname and p.cmd = op.cmd
       ) $$,
  'toda tabla de negocio tiene política de lectura, alta, edición y baja'
);

-- Una vista sin security_invoker lee con los permisos de su dueño y se salta
-- la RLS de las tablas que consulta.
select is_empty(
  $$ select c.relname from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'v'
       and not coalesce('security_invoker=true' = any (c.reloptions), false) $$,
  'toda vista de public corre con los permisos de quien consulta'
);

select is_empty(
  $$ select table_name from information_schema.role_table_grants
     where grantee = 'anon' and table_schema = 'public' $$,
  'el rol anónimo no tiene permisos sobre ninguna tabla de public'
);

select is_empty(
  $$ select p.proname from pg_proc p
     where p.pronamespace = 'private'::regnamespace and p.prosecdef
       and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') $$,
  'las funciones security definer de private fijan su search_path'
);

select * from finish();
rollback;
