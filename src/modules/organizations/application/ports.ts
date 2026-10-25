/**
 * Lo que el módulo necesita de afuera. La pantalla y los casos de uso hablan
 * con estas interfaces; Supabase (o un falso en las pruebas) las implementa.
 */
import type { Credenciales } from "../domain/credentials";
import type { Invitacion, InvitacionLimpia, MotivoDeRechazo } from "../domain/invitation";
import type { Membresia, Miembro } from "../domain/membership";

export interface Cuenta {
  id: string;
  correo: string;
}

/** Por qué no se pudo entrar, en categorías que la pantalla sabe decir. */
export type FalloDeAcceso = "credenciales" | "correo-sin-confirmar" | "sin-conexion" | "sin-configurar" | "desconocido";

export type ResultadoAcceso = { ok: true; cuenta: Cuenta } | { ok: false; fallo: FalloDeAcceso };

/** Por qué no se pudo pedir el correo de recuperación. */
export type FalloDeRecuperacion = "demasiados-pedidos" | "sin-conexion" | "sin-configurar" | "desconocido";

/** Por qué no se pudo abrir el enlace o fijar la contraseña nueva. */
export type FalloDeContrasena =
  | "debil"
  | "igual-a-la-anterior"
  | "enlace-vencido"
  | "sin-conexion"
  | "sin-configurar"
  | "desconocido";

export type Resultado<F> = { ok: true } | { ok: false; fallo: F };

export interface SesionPuerto {
  cuentaActual(): Promise<Cuenta | null>;
  iniciar(credenciales: Credenciales): Promise<ResultadoAcceso>;
  cerrar(): Promise<void>;
  /**
   * Manda el correo con el enlace para fijar una contraseña nueva. Contesta
   * igual exista o no la cuenta. `volverA` es la dirección de la app a la que
   * lleva el enlace.
   */
  pedirRecuperacion(correo: string, volverA: string): Promise<Resultado<FalloDeRecuperacion>>;
  /** Abre la sesión de recuperación con lo que trajo el enlace del correo. */
  abrirRecuperacion(tokenDeAcceso: string, tokenDeRenovacion: string): Promise<Resultado<FalloDeContrasena>>;
  /** Fija la contraseña de la cuenta con sesión (la de recuperación). */
  fijarContrasena(nueva: string): Promise<Resultado<FalloDeContrasena>>;
  /** Avisa cada vez que la sesión cambia (entra, sale, caduca). Devuelve cómo dejar de escuchar. */
  alCambiar(aviso: (cuenta: Cuenta | null) => void): () => void;
}

export interface MembresiasPuerto {
  /** Las administradoras de la persona con sesión. La RLS ya filtra. */
  mias(): Promise<Membresia[]>;
}

// Invitaciones (PB-23) -----------------------------------------------------------

/** Por qué no se pudo invitar, reenviar o cancelar. */
export type FalloDeInvitacion =
  /** Ya hay una invitación abierta para ese correo (y esa unidad): se reenvía esa. */
  | "ya-invitada"
  /** Ya la aceptó: no se reenvía ni se cancela. */
  | "ya-usada"
  | "sin-permiso"
  | "no-existe"
  /** La base rechazó un dato que la pantalla debió atajar (una unidad ajena, un rol sin unidad). */
  | "invalido"
  /** Se guardó, pero Auth no pudo mandar el correo (límite de envíos u otro). */
  | "correo-no-enviado"
  | "sin-conexion"
  | "sin-configurar"
  | "desconocido";

/** Por qué no se pudo aceptar: el motivo de la base, o algo del camino. */
export type FalloAlAceptar = MotivoDeRechazo | "sin-sesion" | "sin-conexion" | "sin-configurar" | "desconocido";

export interface InvitacionesPuerto {
  /** Las invitaciones de la administradora (solo el administrador las lee). Rechaza si no se pudo leer. */
  listar(orgId: string): Promise<Invitacion[]>;
  /** Las cuentas de la administradora con su correo. Rechaza si no se pudo leer. */
  miembros(orgId: string): Promise<Miembro[]>;
  /**
   * Guarda la invitación y manda el correo. `volverA` es la dirección de la
   * pantalla de aceptación; el enlace le agrega el token.
   */
  invitar(orgId: string, datos: InvitacionLimpia, volverA: string): Promise<Resultado<FalloDeInvitacion>>;
  /** Nuevo enlace, nuevo vencimiento, otro correo. El enlace anterior deja de servir. */
  reenviar(orgId: string, id: string, volverA: string): Promise<Resultado<FalloDeInvitacion>>;
  cancelar(orgId: string, id: string): Promise<Resultado<FalloDeInvitacion>>;
  /**
   * ¿La cuenta con sesión todavía no tiene contraseña? Pasa cuando abrió el
   * primer enlace sin terminar y llega con el del reenvío.
   */
  cuentaSinContrasena(): Promise<boolean>;
  /** Acepta con la sesión abierta. Devuelve la administradora a la que entró. */
  aceptar(token: string): Promise<{ ok: true; orgId: string } | { ok: false; fallo: FalloAlAceptar }>;
}

/**
 * Lo que el formulario necesita del padrón para invitar a un residente. Lo
 * implementa la ruta con los adaptadores del padrón: `organizaciones` no
 * importa de `padron` (está aguas arriba).
 */
export interface UnidadesParaInvitarPuerto {
  edificios(orgId: string): Promise<{ id: string; nombre: string }[]>;
  unidades(orgId: string, edificioId: string): Promise<{ id: string; numero: string }[]>;
  /** Las personas vinculadas a la unidad. */
  personas(orgId: string, unidadId: string): Promise<{ id: string; nombre: string; tieneCuenta: boolean }[]>;
}
