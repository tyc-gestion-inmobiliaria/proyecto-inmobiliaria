/**
 * `ResidentePuerto` sobre Supabase: los vínculos (`unidad_persona`) de la
 * persona que tiene la cuenta con sesión, con su unidad y su edificio. La RLS
 * ya limita al residente a lo suyo; el filtro por su persona es para que un
 * administrador que también es residente vea solo sus unidades acá.
 */
import { clienteSupabase } from "@/shared/supabase/client";

import type { ResidentePuerto } from "../application/ports";
import { ordenarMisUnidades, type MiUnidad } from "../domain/my-unit";

interface Fila {
  unidad: { id: string; numero: string; edificio: { id: string; nombre: string } | null } | null;
}

export const residenteSupabase: ResidentePuerto = {
  async misUnidades(orgId) {
    const c = clienteSupabase();
    if (!c) throw new Error("sin-configurar");
    const { data: sesion } = await c.auth.getUser();
    if (!sesion.user) return [];
    const { data, error } = await c
      .from("unidad_persona")
      .select("unidad(id, numero, edificio(id, nombre)), persona!inner(usuario_id)")
      .eq("org_id", orgId)
      .eq("persona.usuario_id", sesion.user.id)
      .returns<Fila[]>();
    if (error) throw error;
    const unidades = new Map<string, MiUnidad>();
    for (const f of data ?? []) {
      if (!f.unidad?.edificio) continue;
      unidades.set(f.unidad.id, { id: f.unidad.id, numero: f.unidad.numero, edificioId: f.unidad.edificio.id, edificioNombre: f.unidad.edificio.nombre });
    }
    return ordenarMisUnidades([...unidades.values()]);
  },
};
