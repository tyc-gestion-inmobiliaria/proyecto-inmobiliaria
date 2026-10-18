/**
 * `EdificiosPuerto` sobre la tabla `edificio`. Cuenta sin traer filas.
 */
import { clienteSupabase } from "@/compartido/supabase/cliente";

import type { EdificiosPuerto } from "../aplicacion/puertos";

export const edificiosSupabase: EdificiosPuerto = {
  async contar(orgId) {
    const cliente = clienteSupabase();
    if (!cliente) return 0;
    const { count, error } = await cliente.from("edificio").select("id", { count: "exact", head: true }).eq("org_id", orgId);
    if (error) throw error;
    return count ?? 0;
  },
};
