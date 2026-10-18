/**
 * Lo que el módulo necesita de afuera. La pantalla y los casos de uso hablan
 * con estas interfaces; Supabase (o un falso en las pruebas) las implementa.
 */
import type { Credenciales } from "../dominio/credenciales";
import type { Membresia } from "../dominio/membresia";

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
