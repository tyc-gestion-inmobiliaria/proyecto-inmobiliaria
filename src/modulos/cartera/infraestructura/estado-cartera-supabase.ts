/**
 * `EstadoDeLaCarteraPuerto` sobre Supabase: la vista
 * `participacion_por_edificio` y la tabla `cuenta_bancaria`, una consulta
 * cada una para toda la administradora. El filtro por `org_id` acompaña a la
 * RLS, no la reemplaza.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { clienteSupabase } from "@/compartido/supabase/cliente";

import type { EstadoDeLaCarteraPuerto } from "../aplicacion/puertos";
import type { CierreDelMes, EstadoDelPadron } from "../dominio/cartera";

function cliente(): SupabaseClient {
  const c = clienteSupabase();
  // Sin servidor no hay estado que mostrar.
  if (!c) throw new Error("Supabase sin configurar");
  return c;
}

interface FilaParticipacion {
  edificio_id: string;
  unidades: number;
  sin_participacion: number;
  /** `numeric` llega como texto o número según el tamaño. */
  total: number | string;
  suma_cien: boolean;
}

export const estadoCarteraSupabase: EstadoDeLaCarteraPuerto = {
  async padronPorEdificio(orgId) {
    const { data, error } = await cliente()
      .from("participacion_por_edificio")
      .select("edificio_id, unidades, sin_participacion, total, suma_cien")
      .eq("org_id", orgId)
      .returns<FilaParticipacion[]>();
    if (error) throw error;
    return new Map(
      (data ?? []).map((f): [string, EstadoDelPadron] => [
        f.edificio_id,
        { unidades: f.unidades, sinParticipacion: f.sin_participacion, total: Number(f.total), sumaCien: f.suma_cien },
      ]),
    );
  },

  async edificiosConCuenta(orgId) {
    const { data, error } = await cliente()
      .from("cuenta_bancaria")
      .select("edificio_id")
      .eq("org_id", orgId)
      .returns<{ edificio_id: string }[]>();
    if (error) throw error;
    return new Set((data ?? []).map((f) => f.edificio_id));
  },

  async cierresDelPeriodo(orgId, periodo) {
    const { data, error } = await cliente()
      .from("cierre_por_edificio")
      .select("edificio_id, estado, paso")
      .eq("org_id", orgId)
      .eq("periodo", periodo)
      .returns<{ edificio_id: string; estado: CierreDelMes["estado"]; paso: CierreDelMes["paso"] }[]>();
    if (error) throw error;
    return new Map((data ?? []).map((f): [string, CierreDelMes] => [f.edificio_id, { estado: f.estado, paso: f.paso }]));
  },
};
