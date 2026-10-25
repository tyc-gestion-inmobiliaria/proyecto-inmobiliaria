/**
 * El padrón entero como lo piden las rutas: sobre Supabase o, en la maqueta,
 * sobre los falsos en memoria apuntando a los datos compartidos.
 */
import { EN_MAQUETA } from "@/shared/mock/mode";
import { mundo } from "@/shared/mock/world";

import type { EdificiosPuerto, PuertosDelPadron } from "../application/ports";
import { EdificiosFalso } from "./buildings-fake";
import { edificiosSupabase } from "./buildings-supabase";
import { PadronFalso } from "./registry-fake";
import { cuentasBancariasSupabase, personasSupabase, unidadesSupabase, vinculosSupabase } from "./registry-supabase";

export const padronSupabase: PuertosDelPadron = {
  edificios: edificiosSupabase,
  unidades: unidadesSupabase,
  personas: personasSupabase,
  vinculos: vinculosSupabase,
  cuentas: cuentasBancariasSupabase,
};

type ClaveDelMundo = "edificios" | "unidades" | "personas" | "vinculos" | "cuentas";

/** Hace que el falso lea y escriba los arreglos de `mundo`, aunque los reemplace al borrar. */
function sobreElMundo<T extends object>(falso: T, claves: readonly ClaveDelMundo[]): T {
  for (const clave of claves) {
    Object.defineProperty(falso, clave, {
      get: () => mundo[clave],
      set: (valor) => {
        (mundo as unknown as Record<ClaveDelMundo, unknown>)[clave] = valor;
      },
    });
  }
  return falso;
}

function padronDeMaqueta(): PuertosDelPadron {
  const edificios = sobreElMundo(new EdificiosFalso(), ["edificios"]);
  const padron = sobreElMundo(new PadronFalso(), ["unidades", "personas", "vinculos", "cuentas"]);
  return {
    edificios,
    unidades: padron.comoUnidades(),
    personas: padron,
    vinculos: padron,
    cuentas: padron.comoCuentas(),
  };
}

export const padron: PuertosDelPadron = EN_MAQUETA ? padronDeMaqueta() : padronSupabase;
export const edificios: EdificiosPuerto = padron.edificios;
