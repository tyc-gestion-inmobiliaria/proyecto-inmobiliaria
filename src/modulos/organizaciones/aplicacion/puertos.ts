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

export interface SesionPuerto {
  cuentaActual(): Promise<Cuenta | null>;
  iniciar(credenciales: Credenciales): Promise<ResultadoAcceso>;
  cerrar(): Promise<void>;
  /** Avisa cada vez que la sesión cambia (entra, sale, caduca). Devuelve cómo dejar de escuchar. */
  alCambiar(aviso: (cuenta: Cuenta | null) => void): () => void;
}

export interface MembresiasPuerto {
  /** Las administradoras de la persona con sesión. La RLS ya filtra. */
  mias(): Promise<Membresia[]>;
}
