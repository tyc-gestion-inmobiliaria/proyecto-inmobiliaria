/**
 * `EdificiosPuerto` sobre la tabla `edificio`. La RLS decide qué se ve y quién
 * escribe; el filtro por `org_id` la acompaña, para que la consulta diga la
 * administradora que pide y use el índice `(org_id, id)`.
 */
import { clienteSupabase } from "@/shared/supabase/client";

import type { EdificiosPuerto, ResultadoGuardado } from "../application/ports";
import type { Edificio } from "../domain/building";
import { clasificarFallo } from "./classify-failure";

interface Fila {
  id: string;
  org_id: string;
  nombre: string;
  direccion: string | null;
}

const COLUMNAS = "id, org_id, nombre, direccion";

function aEdificio(f: Fila): Edificio {
  return { id: f.id, orgId: f.org_id, nombre: f.nombre, direccion: f.direccion };
}

function resultado(data: Fila | null, error: { code?: string; message?: string } | null): ResultadoGuardado {
  if (error || !data) return { ok: false, fallo: clasificarFallo(error) };
  return { ok: true, edificio: aEdificio(data) };
}

export const edificiosSupabase: EdificiosPuerto = {
  async contar(orgId) {
    const cliente = clienteSupabase();
    if (!cliente) return 0;
    const { count, error } = await cliente.from("edificio").select("id", { count: "exact", head: true }).eq("org_id", orgId);
    if (error) throw error;
    return count ?? 0;
  },

  async listar(orgId) {
    const cliente = clienteSupabase();
    // Sin servidor no hay lista: decir "no hay edificios" sería mentir.
    if (!cliente) throw new Error("Supabase sin configurar");
    const { data, error } = await cliente.from("edificio").select(COLUMNAS).eq("org_id", orgId).order("nombre").returns<Fila[]>();
    if (error) throw error;
    return (data ?? []).map(aEdificio);
  },

  async crear(orgId, datos) {
    const cliente = clienteSupabase();
    if (!cliente) return { ok: false, fallo: "sin-configurar" };
    try {
      const { data, error } = await cliente
        .from("edificio")
        .insert({ org_id: orgId, nombre: datos.nombre, direccion: datos.direccion })
        .select(COLUMNAS)
        .single<Fila>();
      return resultado(data, error);
    } catch (error) {
      return { ok: false, fallo: clasificarFallo(error as Error) };
    }
  },

  async actualizar(orgId, id, datos) {
    const cliente = clienteSupabase();
    if (!cliente) return { ok: false, fallo: "sin-configurar" };
    try {
      const { data, error } = await cliente
        .from("edificio")
        .update({ nombre: datos.nombre, direccion: datos.direccion })
        .eq("org_id", orgId)
        .eq("id", id)
        .select(COLUMNAS)
        .single<Fila>();
      return resultado(data, error);
    } catch (error) {
      return { ok: false, fallo: clasificarFallo(error as Error) };
    }
  },
};
