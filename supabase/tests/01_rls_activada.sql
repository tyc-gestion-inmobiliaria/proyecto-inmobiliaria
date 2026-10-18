-- Red de seguridad del esquema: falla si una tabla nueva llega sin RLS, sin
-- políticas, sin org_id o sin su prueba de aislamiento (PB-12, Arquitectura
-- §11: "una tabla nueva queda sin RLS").
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

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

-- Al agregar una tabla, se suma acá y se escribe su caso en 02_aislamiento.sql.
select set_eq(
  $$ select c.relname::text from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') $$,
  array['organizacion', 'membresia', 'edificio', 'unidad'],
  'cada tabla de public tiene su prueba de aislamiento'
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
