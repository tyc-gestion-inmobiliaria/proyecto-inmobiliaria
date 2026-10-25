/**
 * `NotificacionesPuerto` sobre Supabase: la bandeja `envio`, que la RLS deja
 * leer solo al administrador. Los datos de la unidad y del destinatario son
 * los que el disparador copió al encolar.
 */
import { clienteSupabase } from "@/shared/supabase/client";

import type { NotificacionesPuerto } from "../application/ports";
import type { Envio, EstadoDelEnvio } from "../domain/delivery";

interface Fila {
  id: string;
  estado: EstadoDelEnvio;
  correo: string | null;
  ultimo_error: string | null;
  datos: { unidad?: string; nombre?: string | null } | null;
}

export const notificacionesSupabase: NotificacionesPuerto = {
  async delCierre(orgId, cierreId) {
    const c = clienteSupabase();
    if (!c) throw new Error("sin-configurar");
    const { data, error } = await c
      .from("envio")
      .select("id, estado, correo, ultimo_error, datos, recibo!inner(cierre_id)")
      .eq("org_id", orgId)
      .eq("tipo", "recibo")
      .eq("recibo.cierre_id", cierreId)
      .returns<Fila[]>();
    if (error) throw error;
    return (data ?? []).map(
      (f): Envio => ({
        id: f.id,
        estado: f.estado,
        unidad: f.datos?.unidad ?? "—",
        destinatario: f.datos?.nombre ?? null,
        correo: f.correo,
        motivo: f.ultimo_error,
      }),
    );
  },
};
