/**
 * El portal del residente como lo pide la ruta: Supabase o, en la maqueta,
 * las unidades de la persona vinculada a la cuenta con sesión (en la
 * semilla, `residente@demo.test`).
 */
import { correoEnLaMaqueta, demora, EN_MAQUETA } from "@/shared/mock/mode";
import { mundo } from "@/shared/mock/world";

import type { ResidentePuerto } from "../application/ports";
import { ordenarMisUnidades, type MiUnidad } from "../domain/my-unit";
import { residenteSupabase } from "./resident-supabase";

const residenteDeMaqueta: ResidentePuerto = {
  misUnidades(orgId) {
    const correo = correoEnLaMaqueta();
    const personas = new Set(mundo.personas.filter((p) => p.orgId === orgId && correo && p.usuarioId === `cuenta-${correo}`).map((p) => p.id));
    const unidades = mundo.vinculos
      .filter((v) => personas.has(v.personaId))
      .flatMap((v): MiUnidad[] => {
        const u = mundo.unidades.find((x) => x.id === v.unidadId);
        const e = u && mundo.edificios.find((x) => x.id === u.edificioId);
        return u && e ? [{ id: u.id, numero: u.numero, edificioId: e.id, edificioNombre: e.nombre }] : [];
      });
    return demora(ordenarMisUnidades(unidades));
  },
};

export const residente: ResidentePuerto = EN_MAQUETA ? residenteDeMaqueta : residenteSupabase;
