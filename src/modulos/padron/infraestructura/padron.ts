/** El padrón entero sobre Supabase, como lo piden las rutas. */
import type { PuertosDelPadron } from "../aplicacion/puertos";
import { edificiosSupabase } from "./edificios-supabase";
import { cuentasBancariasSupabase, personasSupabase, unidadesSupabase, vinculosSupabase } from "./padron-supabase";

export const padronSupabase: PuertosDelPadron = {
  edificios: edificiosSupabase,
  unidades: unidadesSupabase,
  personas: personasSupabase,
  vinculos: vinculosSupabase,
  cuentas: cuentasBancariasSupabase,
};
