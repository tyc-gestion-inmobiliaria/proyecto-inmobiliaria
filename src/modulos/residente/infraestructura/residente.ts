/**
 * El portal del residente como lo pide la ruta: Supabase o, en la maqueta,
 * las unidades de la persona vinculada a la cuenta con sesión (en la
 * semilla, `residente@demo.test`).
 */
import { correoEnLaMaqueta, demora, EN_MAQUETA } from "@/compartido/maqueta/modo";
import { mundo } from "@/compartido/maqueta/mundo";

import type { ResidentePuerto } from "../aplicacion/puertos";
import { ordenarMisUnidades, type MiUnidad } from "../dominio/mi-unidad";
import { residenteSupabase } from "./residente-supabase";

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
