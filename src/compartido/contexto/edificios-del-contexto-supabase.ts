/**
 * `EdificiosDelContextoPuerto` sobre la tabla `edificio`: solo el id y el
 * nombre, para el selector. El alta y la ficha del edificio son del módulo
 * `padron`; cuando tenga su listado, este adaptador puede delegar en él.
 */
import { clienteSupabase } from "@/compartido/supabase/cliente";

import type { EdificiosDelContextoPuerto } from "./contexto";

export const edificiosDelContextoSupabase: EdificiosDelContextoPuerto = {
  async listar(orgId) {
    const cliente = clienteSupabase();
    if (!cliente) return [];
    const { data, error } = await cliente.from("edificio").select("id, nombre").eq("org_id", orgId).order("nombre");
    if (error) throw error;
    return (data ?? []).map((e) => ({ id: String(e.id), nombre: String(e.nombre) }));
  },
};
