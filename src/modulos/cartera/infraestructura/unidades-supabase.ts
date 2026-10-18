/**
 * `UnidadesPuerto` sobre la tabla `unidad`. Cuenta sin traer filas; filtra por
 * administradora además del edificio, aunque la RLS ya lo haga.
 */
import { clienteSupabase } from "@/compartido/supabase/cliente";

import type { UnidadesPuerto } from "../aplicacion/puertos";

export const unidadesSupabase: UnidadesPuerto = {
  async contarDelEdificio(orgId, edificioId) {
    const cliente = clienteSupabase();
    if (!cliente) return 0;
    const { count, error } = await cliente
      .from("unidad")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("edificio_id", edificioId);
    if (error) throw error;
    return count ?? 0;
  },
};
