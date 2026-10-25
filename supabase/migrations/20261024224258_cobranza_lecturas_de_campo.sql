-- Cobranza: el personal toma las lecturas en el edificio (PB-29).
--
-- Hasta ahora solo el administrador escribía en `lectura`. El personal del
-- edificio recorre las unidades con el teléfono y carga la lectura actual y
-- la foto del medidor, mientras el cierre está en borrador. No toca la
-- lectura anterior (es la del mes pasado) ni ninguna otra columna: eso sigue
-- siendo del administrador.
--
-- Cada lectura guarda quién la tomó y cuándo, para que el administrador lo
-- vea en el paso 1 ("quién la tomó", criterio de PB-29). Lo pone la base, no
-- el cliente.
--
-- Supuesto: el personal puede corregir una lectura que ya cargó (o que cargó
-- otro) mientras el cierre siga en borrador; el administrador ve quién fue
-- el último.

alter table public.lectura
  add column tomada_por uuid references auth.users (id) on delete set null,
  add column tomada_en timestamptz;

comment on column public.lectura.tomada_por is 'Quién cargó por última vez la lectura actual o la foto. Lo pone el disparador.';
comment on column public.lectura.tomada_en is 'Cuándo se cargó por última vez la lectura actual o la foto.';

-- El personal actualiza; la RLS decide la fila y el disparador, las columnas.
create policy lectura_edicion_personal on public.lectura
  for update to authenticated
  using ((select private.tiene_rol(org_id, 'personal')) and (select private.cierre_en_borrador(cierre_id)))
  with check ((select private.tiene_rol(org_id, 'personal')) and (select private.cierre_en_borrador(cierre_id)));

-- Quién y cuándo, para todos; y lo que no es del personal, solo para el administrador.
create function private.lectura_de_campo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.tiene_rol(old.org_id, 'administrador')
     and (new.anterior is distinct from old.anterior
          or new.org_id is distinct from old.org_id
          or new.cierre_id is distinct from old.cierre_id
          or new.unidad_id is distinct from old.unidad_id) then
    raise exception 'El personal solo carga la lectura actual y la foto'
      using errcode = '42501';
  end if;
  if new.actual is distinct from old.actual or new.foto is distinct from old.foto then
    new.tomada_por := (select auth.uid());
    new.tomada_en := now();
  end if;
  return new;
end;
$$;

revoke all on function private.lectura_de_campo() from public, anon, authenticated;

create trigger lectura_de_campo
  before update on public.lectura
  for each row execute function private.lectura_de_campo();

-- Las fotos del medidor: el personal sube y reemplaza en la carpeta de su administradora.
create policy lecturas_foto_alta_personal on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lecturas' and (select private.tiene_rol(((storage.foldername(name))[1])::uuid, 'personal')));

create policy lecturas_foto_edicion_personal on storage.objects
  for update to authenticated
  using (bucket_id = 'lecturas' and (select private.tiene_rol(((storage.foldername(name))[1])::uuid, 'personal')));
