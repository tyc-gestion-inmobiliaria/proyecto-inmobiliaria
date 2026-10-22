/**
 * Lo que la cobranza necesita de afuera. Supabase lo implementa en
 * `infraestructura/`; las pruebas, con un falso.
 *
 * Leer rechaza si no se pudo (decir "no hay recibos" cuando no se pudo leer
 * sería mentir). Escribir no rechaza: devuelve el fallo en una categoría que
 * la pantalla sabe decir.
 *
 * Lo que el cierre necesita del padrón (unidades, participación, cuentas) lo
 * lee este puerto de la base, sin pasar por el módulo del padrón.
 */
import type { Cierre, NumeroDePaso } from "../dominio/cierre";
import type { Lectura } from "../dominio/lectura";
import type { Periodo } from "../dominio/periodo";
import type { Partida } from "../dominio/presupuesto";
import type { FilaPrevia, Recibo } from "../dominio/recibo";
import type { EstadoDelPadron } from "../dominio/validaciones";

export type FalloDeCobranza =
  | "sin-permiso"
  | "no-existe"
  /** La lectura es menor que la anterior u otro dato que la base no acepta. */
  | "invalido"
  | "participacion"
  | "sin-cuenta"
  | "ya-emitido"
  | "sin-conexion"
  | "sin-configurar"
  | "desconocido";

export type Resultado<T> = { ok: true; valor: T } | { ok: false; fallo: FalloDeCobranza };

export interface EdificioDelCierre {
  id: string;
  nombre: string;
  direccion: string | null;
}

export interface CuentaDelRecibo {
  banco: string;
  numero: string;
  cci: string | null;
  moneda: string;
}

export interface CambiosDelCierre {
  paso?: NumeroDePaso;
  montoAgua?: number;
  umbralAtipico?: number;
}

export interface CobranzaPuerto {
  /** El cierre del periodo, si ya se abrió. */
  cierreDelPeriodo(orgId: string, edificioId: string, periodo: Periodo): Promise<Cierre | null>;
  /** Abre el cierre del periodo o devuelve el que ya existe. */
  abrirCierre(edificioId: string, periodo: Periodo): Promise<Resultado<string>>;
  cierre(orgId: string, cierreId: string): Promise<Cierre | null>;
  edificio(orgId: string, edificioId: string): Promise<EdificioDelCierre | null>;
  /** Participación y cuentas del edificio, para las validaciones. */
  padron(orgId: string, edificioId: string): Promise<EstadoDelPadron>;
  cuentas(orgId: string, edificioId: string): Promise<CuentaDelRecibo[]>;
  guardarCierre(orgId: string, cierreId: string, cambios: CambiosDelCierre): Promise<Resultado<null>>;

  lecturas(orgId: string, cierreId: string): Promise<Lectura[]>;
  guardarLectura(orgId: string, lecturaId: string, valores: { anterior: number | null; actual: number | null }): Promise<Resultado<null>>;
  subirFoto(orgId: string, lectura: Lectura, cierreId: string, archivo: ArchivoDeFoto): Promise<Resultado<string>>;
  /** Una dirección temporal para ver la foto (el bucket es privado). */
  urlDeFoto(ruta: string): Promise<string | null>;

  partidas(orgId: string, cierreId: string): Promise<Partida[]>;
  /** Reemplaza las partidas del cierre por estas. */
  guardarPartidas(orgId: string, cierreId: string, partidas: readonly Partida[]): Promise<Resultado<null>>;
  /** Las partidas del último cierre anterior del edificio, para copiarlas. */
  partidasDelPeriodoAnterior(orgId: string, edificioId: string, periodo: Periodo): Promise<Partida[]>;

  /** La vista previa que calcula la base. */
  vistaPrevia(cierreId: string): Promise<FilaPrevia[]>;
  /** Emite en una transacción; repetirla no duplica. Devuelve cuántos recibos tiene el cierre. */
  emitir(cierreId: string, vence: string): Promise<Resultado<number>>;

  recibosDelCierre(orgId: string, cierreId: string): Promise<Recibo[]>;
  recibosDeLaUnidad(orgId: string, unidadId: string): Promise<Recibo[]>;
  recibo(orgId: string, reciboId: string): Promise<Recibo | null>;
  nombreDeLaAdministradora(orgId: string): Promise<string>;

  /** El cierre del periodo de cada edificio de la administradora, para la cartera. */
  cierresDelPeriodo(orgId: string, periodo: Periodo): Promise<Map<string, Pick<Cierre, "id" | "estado" | "paso">>>;
}

/** La foto como la entrega el selector: una URI (nativo) o un Blob (web). */
export interface ArchivoDeFoto {
  uri: string;
  tipo: string;
  extension: string;
}
