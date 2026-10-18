/**
 * Lo que el padrón necesita de afuera. Supabase lo implementa en
 * `infraestructura/`; las pruebas, con un falso.
 */
import type { CuentaBancaria, CuentaLimpia } from "../dominio/cuenta-bancaria";
import type { Edificio, EdificioLimpio } from "../dominio/edificio";
import type { ResumenParticipacion } from "../dominio/participacion";
import type { Persona, PersonaLimpia } from "../dominio/persona";
import type { Unidad, UnidadLimpia } from "../dominio/unidad";
import type { Relacion, Vinculo } from "../dominio/vinculo";

/** Por qué no se pudo guardar, en categorías que la pantalla sabe decir. */
export type FalloAlGuardar = "nombre-repetido" | "sin-permiso" | "no-existe" | "sin-conexion" | "sin-configurar" | "desconocido";

export type ResultadoGuardado = { ok: true; edificio: Edificio } | { ok: false; fallo: FalloAlGuardar };

export interface EdificiosPuerto {
  /** Cuántos edificios tiene registrados la administradora. */
  contar(orgId: string): Promise<number>;
  /** Los edificios de la administradora. Si no se pudieron leer, rechaza. */
  listar(orgId: string): Promise<Edificio[]>;
  crear(orgId: string, datos: EdificioLimpio): Promise<ResultadoGuardado>;
  actualizar(orgId: string, id: string, datos: EdificioLimpio): Promise<ResultadoGuardado>;
}

// Unidades, personas, vínculos y cuentas bancarias ------------------------------
//
// Leer rechaza si no se pudo (decir "no hay personas" cuando no se pudo leer
// sería mentir). Escribir no rechaza: devuelve el fallo en una categoría que
// la pantalla sabe decir junto al campo o al botón.

export type FalloDelPadron =
  /** Ya existe: número de unidad, documento, número de cuenta o vínculo repetido. */
  | "repetido"
  /** La unidad ya tiene otro responsable de pago. */
  | "otro-responsable"
  | "sin-permiso"
  | "no-existe"
  /** La base rechazó un dato que la pantalla debió atajar. */
  | "invalido"
  | "sin-conexion"
  | "sin-configurar"
  | "desconocido";

export type Resultado<T> = { ok: true; valor: T } | { ok: false; fallo: FalloDelPadron };

export interface UnidadesPuerto {
  /** Las unidades del edificio, ordenadas por número. */
  delEdificio(orgId: string, edificioId: string): Promise<Unidad[]>;
  /** La suma de participaciones del edificio, como la calcula la base. */
  participacion(orgId: string, edificioId: string): Promise<ResumenParticipacion>;
  crear(orgId: string, edificioId: string, datos: UnidadLimpia): Promise<Resultado<Unidad>>;
  actualizar(orgId: string, id: string, datos: UnidadLimpia): Promise<Resultado<Unidad>>;
}

export interface PersonasPuerto {
  /** Las personas de la administradora, por nombre. */
  listar(orgId: string): Promise<Persona[]>;
  crear(orgId: string, datos: PersonaLimpia): Promise<Resultado<Persona>>;
  actualizar(orgId: string, id: string, datos: PersonaLimpia): Promise<Resultado<Persona>>;
  borrar(orgId: string, id: string): Promise<Resultado<null>>;
}

export interface NuevoVinculo {
  unidadId: string;
  personaId: string;
  relacion: Relacion;
}

export interface VinculosPuerto {
  /** Quién es quién en la unidad. */
  deLaUnidad(orgId: string, unidadId: string): Promise<Vinculo[]>;
  /** Las unidades de una persona. */
  deLaPersona(orgId: string, personaId: string): Promise<Vinculo[]>;
  vincular(orgId: string, datos: NuevoVinculo): Promise<Resultado<Vinculo>>;
  cambiarRelacion(orgId: string, id: string, relacion: Relacion): Promise<Resultado<Vinculo>>;
  /** Pasa la marca de responsable de pago a este vínculo, en un solo paso. */
  elegirResponsable(orgId: string, id: string): Promise<Resultado<null>>;
  desvincular(orgId: string, id: string): Promise<Resultado<null>>;
}

export interface CuentasBancariasPuerto {
  delEdificio(orgId: string, edificioId: string): Promise<CuentaBancaria[]>;
  crear(orgId: string, edificioId: string, datos: CuentaLimpia): Promise<Resultado<CuentaBancaria>>;
  actualizar(orgId: string, id: string, datos: CuentaLimpia): Promise<Resultado<CuentaBancaria>>;
  borrar(orgId: string, id: string): Promise<Resultado<null>>;
}

/** Lo que usan las pantallas de unidades y personas, juntos. */
export interface PuertosDelPadron {
  edificios: EdificiosPuerto;
  unidades: UnidadesPuerto;
  personas: PersonasPuerto;
  vinculos: VinculosPuerto;
}
