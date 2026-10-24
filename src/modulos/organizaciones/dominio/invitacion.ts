/**
 * La invitación (PB-23): un administrador invita a una persona con un rol y,
 * si es residente, con su unidad. Las reglas de acá adelantan el aviso; la
 * que manda es la base (`invitacion` y `aceptar_invitacion`).
 *
 * Supuesto, a confirmar con el cliente: una invitación vale 7 días (el
 * `default` de `vence_en`).
 */
import { normalizarCorreo, validarCorreo } from "./credenciales";
import { ROLES, type Rol } from "./membresia";

export const VIGENCIA_DIAS = 7;

/** Quién es el residente en su unidad, con las palabras del padrón. */
export const RELACIONES = ["propietario", "inquilino", "residente"] as const;
export type Relacion = (typeof RELACIONES)[number];

const NOMBRE_DE_LA_RELACION: Record<Relacion, string> = {
  propietario: "Propietario",
  inquilino: "Inquilino",
  residente: "Residente",
};

export function nombreDeLaRelacion(r: Relacion): string {
  return NOMBRE_DE_LA_RELACION[r];
}

export function esRelacion(valor: unknown): valor is Relacion {
  return typeof valor === "string" && (RELACIONES as readonly string[]).includes(valor);
}

// Estado ---------------------------------------------------------------------

export type EstadoInvitacion = "pendiente" | "aceptada" | "vencida" | "cancelada";

const NOMBRE_DEL_ESTADO: Record<EstadoInvitacion, string> = {
  pendiente: "Pendiente",
  aceptada: "Aceptada",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

export function nombreDelEstado(e: EstadoInvitacion): string {
  return NOMBRE_DEL_ESTADO[e];
}

export interface Invitacion {
  id: string;
  correo: string;
  rol: Rol;
  unidadId: string | null;
  personaId: string | null;
  nombre: string | null;
  /** ISO 8601. */
  venceEn: string;
  usadaEn: string | null;
  canceladaEn: string | null;
  creadoEn: string;
}

/** Usada o cancelada pesa más que vencida: es lo que pasó primero. */
export function estadoDeInvitacion(
  inv: Pick<Invitacion, "venceEn" | "usadaEn" | "canceladaEn">,
  ahora: Date = new Date(),
): EstadoInvitacion {
  if (inv.usadaEn) return "aceptada";
  if (inv.canceladaEn) return "cancelada";
  if (new Date(inv.venceEn).getTime() <= ahora.getTime()) return "vencida";
  return "pendiente";
}

/** Se puede reenviar una pendiente o una vencida; cancelar, igual. */
export function sigueAbierta(estado: EstadoInvitacion): boolean {
  return estado === "pendiente" || estado === "vencida";
}

const ORDEN_DEL_ESTADO: Record<EstadoInvitacion, number> = { pendiente: 0, vencida: 1, aceptada: 2, cancelada: 3 };

/** Primero lo que espera algo (pendientes, vencidas), luego lo cerrado; dentro, lo más reciente arriba. */
export function ordenarInvitaciones<T extends Invitacion>(lista: readonly T[], ahora: Date = new Date()): T[] {
  return [...lista].sort((a, b) => {
    const porEstado = ORDEN_DEL_ESTADO[estadoDeInvitacion(a, ahora)] - ORDEN_DEL_ESTADO[estadoDeInvitacion(b, ahora)];
    return porEstado !== 0 ? porEstado : b.creadoEn.localeCompare(a.creadoEn);
  });
}

/** Solo el administrador invita (y la RLS de `invitacion` lo exige). */
export function puedeInvitar(rol: Rol): boolean {
  return rol === "administrador";
}

// Formulario -------------------------------------------------------------------

/** En el campo Persona: la ficha que ya está en el padrón, o una nueva. */
export const PERSONA_NUEVA = "nueva";

export interface DatosInvitacion {
  correo: string;
  rol?: Rol;
  edificioId?: string;
  unidadId?: string;
  /** El id de una persona de la unidad, o `PERSONA_NUEVA`. */
  personaId?: string;
  nombre: string;
  relacion?: Relacion;
}

export type CampoInvitacion = "correo" | "rol" | "edificio" | "unidad" | "persona" | "nombre" | "relacion";
export type ErroresInvitacion = Partial<Record<CampoInvitacion, string>>;

/** Lo que se manda: el correo en minúsculas y solo lo que corresponde al rol. */
export type InvitacionLimpia =
  | { correo: string; rol: "administrador" | "personal" }
  | { correo: string; rol: "residente"; unidadId: string; personaId: string }
  | { correo: string; rol: "residente"; unidadId: string; nombre: string; relacion: Relacion };

export const LARGO_MAXIMO_NOMBRE = 200;

export function validarInvitacion(d: DatosInvitacion): ErroresInvitacion {
  const e: ErroresInvitacion = {};
  const errorCorreo = validarCorreo(d.correo);
  if (errorCorreo) e.correo = errorCorreo === "Escribe tu correo." ? "Escribe el correo de la persona." : errorCorreo;
  if (!d.rol || !(ROLES as readonly string[]).includes(d.rol)) e.rol = "Elige el rol.";
  if (d.rol === "residente") {
    if (!d.edificioId) e.edificio = "Elige el edificio.";
    else if (!d.unidadId) e.unidad = "Elige la unidad.";
    else if (!d.personaId) e.persona = "Elige quién es en la unidad.";
    else if (d.personaId === PERSONA_NUEVA) {
      const nombre = d.nombre.trim();
      if (!nombre) e.nombre = "Escribe el nombre.";
      else if (nombre.length > LARGO_MAXIMO_NOMBRE) e.nombre = `Usa hasta ${LARGO_MAXIMO_NOMBRE} caracteres.`;
      if (!d.relacion) e.relacion = "Elige su relación con la unidad.";
    }
  }
  return e;
}

/** La invitación lista para mandar, o `null` si el formulario tiene errores. */
export function limpiarInvitacion(d: DatosInvitacion): InvitacionLimpia | null {
  if (listaDeErrores(validarInvitacion(d)).length > 0 || !d.rol) return null;
  const correo = normalizarCorreo(d.correo);
  if (d.rol !== "residente") return { correo, rol: d.rol };
  if (!d.unidadId || !d.personaId) return null;
  if (d.personaId !== PERSONA_NUEVA) return { correo, rol: "residente", unidadId: d.unidadId, personaId: d.personaId };
  if (!d.relacion) return null;
  return { correo, rol: "residente", unidadId: d.unidadId, nombre: d.nombre.trim(), relacion: d.relacion };
}

const ETIQUETA: Record<CampoInvitacion, string> = {
  correo: "Correo",
  rol: "Rol",
  edificio: "Edificio",
  unidad: "Unidad",
  persona: "Persona",
  nombre: "Nombre",
  relacion: "Relación",
};

const ORDEN_DE_CAMPOS: readonly CampoInvitacion[] = ["correo", "rol", "edificio", "unidad", "persona", "nombre", "relacion"];

export function listaDeErrores(e: ErroresInvitacion): { campo: CampoInvitacion; etiqueta: string; mensaje: string }[] {
  return ORDEN_DE_CAMPOS.flatMap((campo) => {
    const mensaje = e[campo];
    return mensaje ? [{ campo, etiqueta: ETIQUETA[campo], mensaje }] : [];
  });
}

// Aceptar ------------------------------------------------------------------------

/** Por qué la base rechazó aceptar: el `hint` de `aceptar_invitacion`. */
export const MOTIVOS_DE_RECHAZO = ["no_existe", "cancelada", "usada", "vencida", "otro_correo", "persona_ocupada"] as const;
export type MotivoDeRechazo = (typeof MOTIVOS_DE_RECHAZO)[number];

export function esMotivoDeRechazo(valor: unknown): valor is MotivoDeRechazo {
  return typeof valor === "string" && (MOTIVOS_DE_RECHAZO as readonly string[]).includes(valor);
}

const MENSAJE_DE_RECHAZO: Record<MotivoDeRechazo, string> = {
  no_existe: "Este enlace no corresponde a ninguna invitación. Pide a tu administración que te envíe otra.",
  cancelada: "Tu administración canceló esta invitación. Si la necesitas, pide que te envíen otra.",
  usada: "Esta invitación ya se usó. Si no fuiste tú, avisa a tu administración.",
  vencida: "Esta invitación venció. Pide a tu administración que te envíe otra.",
  otro_correo: "Esta invitación es para otro correo. Entra con la cuenta del correo al que llegó la invitación.",
  persona_ocupada: "Tu ficha en la unidad ya está ligada a otra cuenta. Avisa a tu administración.",
};

export function mensajeDeRechazo(m: MotivoDeRechazo): string {
  return MENSAJE_DE_RECHAZO[m];
}

/**
 * Lo que trae el enlace del correo. Va a `/invitacion?token=…`; Supabase Auth
 * agrega en el fragmento la sesión (`type=invite` si la cuenta es nueva,
 * `type=magiclink` si ya existía) o un error si el enlace venció o ya se usó.
 */
export interface EnlaceDeInvitacion {
  token: string | null;
  sesion: { tokenDeAcceso: string; tokenDeRenovacion: string; cuentaNueva: boolean } | null;
  /** Auth rechazó el enlace (vencido o ya usado). */
  vencido: boolean;
}

export const RUTA_DE_INVITACION = "/invitacion";

function datosDelEnlace(url: string): Map<string, string> {
  const almohadilla = url.indexOf("#");
  const interrogacion = url.indexOf("?");
  const partes: string[] = [];
  if (interrogacion >= 0 && (almohadilla < 0 || interrogacion < almohadilla)) {
    partes.push(url.slice(interrogacion + 1, almohadilla >= 0 ? almohadilla : undefined));
  }
  if (almohadilla >= 0) partes.push(url.slice(almohadilla + 1));
  const datos = new Map<string, string>();
  for (const parte of partes) for (const [clave, valor] of new URLSearchParams(parte)) datos.set(clave, valor);
  return datos;
}

/** ¿La dirección es la de aceptar una invitación? (con o sin dominio, en la web o en el teléfono). */
export function esEnlaceDeInvitacion(url: string | null | undefined): boolean {
  if (!url) return false;
  const sinDatos = url.split(/[?#]/)[0];
  return /(^|[/:])invitacion\/?$/.test(sinDatos);
}

export function leerEnlaceDeInvitacion(url: string | null | undefined): EnlaceDeInvitacion {
  if (!url) return { token: null, sesion: null, vencido: false };
  const datos = datosDelEnlace(url);
  const token = datos.get("token") || null;
  const tipo = datos.get("type");
  const tokenDeAcceso = datos.get("access_token");
  const tokenDeRenovacion = datos.get("refresh_token");
  const sesion =
    tokenDeAcceso && tokenDeRenovacion && (tipo === "invite" || tipo === "magiclink" || tipo === "signup")
      ? { tokenDeAcceso, tokenDeRenovacion, cuentaNueva: tipo !== "magiclink" }
      : null;
  const vencido = !sesion && (datos.has("error_code") || datos.has("error"));
  return { token, sesion, vencido };
}
