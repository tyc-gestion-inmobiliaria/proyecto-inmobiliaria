/**
 * `MembresiasPuerto` sobre la tabla `membresia`. La RLS solo devuelve las de
 * la persona con sesión; el filtro por `usuario_id` queda igual, para que la
 * consulta diga lo que pide y use el índice.
 */
import { clienteSupabase } from "@/shared/supabase/client";

import type { MembresiasPuerto } from "../application/ports";
import { esRol, type Membresia } from "../domain/membership";

interface Fila {
  org_id: string;
  rol: string;
  organizacion: { nombre: string } | null;
}

export const membresiasSupabase: MembresiasPuerto = {
  async mias() {
    const cliente = clienteSupabase();
    if (!cliente) return [];
    const { data: sesion } = await cliente.auth.getSession();
    const usuarioId = sesion.session?.user.id;
    if (!usuarioId) return [];
    const { data, error } = await cliente
      .from("membresia")
      .select("org_id, rol, organizacion(nombre)")
      .eq("usuario_id", usuarioId)
      .eq("activa", true)
      .returns<Fila[]>();
    if (error) throw error;
    return (data ?? []).flatMap((f): Membresia[] =>
      esRol(f.rol) && f.organizacion ? [{ orgId: f.org_id, orgNombre: f.organizacion.nombre, rol: f.rol }] : [],
    );
  },
};
