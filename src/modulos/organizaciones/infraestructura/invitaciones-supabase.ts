/**
 * `InvitacionesPuerto` sobre Supabase.
 *
 * - Leer: la tabla `invitacion` (la RLS solo deja al administrador) y la
 *   función `miembros_de_la_organizacion`, que trae el correo de cada cuenta.
 * - Invitar y reenviar: la Edge Function `invitar`, que guarda la fila con la
 *   sesión de quien invita y manda el correo.
 * - Cancelar y aceptar: las funciones `cancelar_invitacion` y
 *   `aceptar_invitacion`, que validan el estado en la base.
 */
import { FunctionsFetchError, FunctionsHttpError, isAuthRetryableFetchError } from "@supabase/supabase-js";

import { clienteSupabase } from "@/compartido/supabase/cliente";

import type { FalloAlAceptar, FalloDeInvitacion, InvitacionesPuerto, Resultado } from "../aplicacion/puertos";
import { esMotivoDeRechazo, type Invitacion, type InvitacionLimpia } from "../dominio/invitacion";
import { esRol, type Miembro } from "../dominio/membresia";

interface FilaInvitacion {
  id: string;
  correo: string;
  rol: string;
  unidad_id: string | null;
  persona_id: string | null;
  nombre: string | null;
  vence_en: string;
  usada_en: string | null;
  cancelada_en: string | null;
  creado_en: string;
}

interface FilaMiembro {
  usuario_id: string;
  correo: string;
  rol: string;
  activa: boolean;
}

const FALLOS: readonly FalloDeInvitacion[] = [
  "ya-invitada",
  "ya-usada",
  "sin-permiso",
  "no-existe",
  "invalido",
  "correo-no-enviado",
  "sin-conexion",
  "sin-configurar",
  "desconocido",
];

function esFallo(valor: unknown): valor is FalloDeInvitacion {
  return typeof valor === "string" && (FALLOS as readonly string[]).includes(valor);
}

/** La función contesta `{ ok: false, fallo }` con un código de error; supabase-js lo deja en `context`. */
async function falloDeLaFuncion(error: unknown): Promise<FalloDeInvitacion> {
  if (error instanceof FunctionsFetchError) return "sin-conexion";
  if (error instanceof FunctionsHttpError) {
    try {
      const cuerpo = (await (error.context as Response).json()) as { fallo?: unknown };
      if (cuerpo.fallo === "sin-sesion") return "sin-permiso";
      if (esFallo(cuerpo.fallo)) return cuerpo.fallo;
    } catch {
      // Sin cuerpo legible.
    }
  }
  return "desconocido";
}

interface ErrorDePostgres {
  code?: string;
  hint?: string | null;
  message?: string;
}

function esSinConexion(error: unknown): boolean {
  return (
    isAuthRetryableFetchError(error) ||
    (error instanceof TypeError && /fetch|network/i.test(error.message)) ||
    (typeof (error as ErrorDePostgres)?.message === "string" && /Failed to fetch|Network request failed/i.test((error as ErrorDePostgres).message ?? ""))
  );
}

async function llamarFuncion(cuerpo: Record<string, unknown>): Promise<Resultado<FalloDeInvitacion>> {
  const cliente = clienteSupabase();
  if (!cliente) return { ok: false, fallo: "sin-configurar" };
  try {
    const { error } = await cliente.functions.invoke("invitar", { body: cuerpo });
    return error ? { ok: false, fallo: await falloDeLaFuncion(error) } : { ok: true };
  } catch (error) {
    return { ok: false, fallo: esSinConexion(error) ? "sin-conexion" : "desconocido" };
  }
}

export const invitacionesSupabase: InvitacionesPuerto = {
  async listar(orgId) {
    const cliente = clienteSupabase();
    if (!cliente) throw new Error("sin-configurar");
    const { data, error } = await cliente
      .from("invitacion")
      .select("id, correo, rol, unidad_id, persona_id, nombre, vence_en, usada_en, cancelada_en, creado_en")
      .eq("org_id", orgId)
      .order("creado_en", { ascending: false })
      .returns<FilaInvitacion[]>();
    if (error) throw error;
    return (data ?? []).flatMap((f): Invitacion[] =>
      esRol(f.rol)
        ? [
            {
              id: f.id,
              correo: f.correo,
              rol: f.rol,
              unidadId: f.unidad_id,
              personaId: f.persona_id,
              nombre: f.nombre,
              venceEn: f.vence_en,
              usadaEn: f.usada_en,
              canceladaEn: f.cancelada_en,
              creadoEn: f.creado_en,
            },
          ]
        : [],
    );
  },

  async miembros(orgId) {
    const cliente = clienteSupabase();
    if (!cliente) throw new Error("sin-configurar");
    const { data, error } = await cliente.rpc("miembros_de_la_organizacion", { p_org_id: orgId });
    if (error) throw error;
    return ((data ?? []) as FilaMiembro[]).flatMap((f): Miembro[] =>
      esRol(f.rol) ? [{ usuarioId: f.usuario_id, correo: f.correo, rol: f.rol, activa: f.activa }] : [],
    );
  },

  invitar(orgId: string, datos: InvitacionLimpia, volverA: string) {
    return llamarFuncion({ accion: "invitar", orgId, volverA, ...datos });
  },

  reenviar(orgId, id, volverA) {
    return llamarFuncion({ accion: "reenviar", orgId, id, volverA });
  },

  async cancelar(_orgId, id) {
    const cliente = clienteSupabase();
    if (!cliente) return { ok: false, fallo: "sin-configurar" };
    try {
      const { error } = await cliente.rpc("cancelar_invitacion", { p_id: id });
      if (!error) return { ok: true };
      const e = error as ErrorDePostgres;
      if (e.hint === "usada") return { ok: false, fallo: "ya-usada" };
      if (e.hint === "no_existe") return { ok: false, fallo: "no-existe" };
      return { ok: false, fallo: esSinConexion(error) ? "sin-conexion" : "desconocido" };
    } catch (error) {
      return { ok: false, fallo: esSinConexion(error) ? "sin-conexion" : "desconocido" };
    }
  },

  async cuentaSinContrasena() {
    const cliente = clienteSupabase();
    if (!cliente) return false;
    const { data, error } = await cliente.rpc("cuenta_sin_contrasena");
    if (error) throw error;
    return data === true;
  },

  async aceptar(token): Promise<{ ok: true; orgId: string } | { ok: false; fallo: FalloAlAceptar }> {
    const cliente = clienteSupabase();
    if (!cliente) return { ok: false, fallo: "sin-configurar" };
    try {
      const { data, error } = await cliente.rpc("aceptar_invitacion", { p_token: token });
      if (!error && typeof data === "string") return { ok: true, orgId: data };
      const e = (error ?? {}) as ErrorDePostgres;
      if (esMotivoDeRechazo(e.hint)) return { ok: false, fallo: e.hint };
      if (e.code === "42501" || e.code === "PGRST301" || e.code === "PGRST303") return { ok: false, fallo: "sin-sesion" };
      return { ok: false, fallo: esSinConexion(error) ? "sin-conexion" : "desconocido" };
    } catch (error) {
      return { ok: false, fallo: esSinConexion(error) ? "sin-conexion" : "desconocido" };
    }
  },
};
