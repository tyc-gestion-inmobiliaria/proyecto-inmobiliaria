/**
 * El estado de cada edificio de la cartera y lo que falta para poder cobrarle
 * (PB-11, H1 y H8). Reglas puras, sin React ni Supabase.
 *
 * Se arma con lo que hay en la base: unidades, la suma de participaciones
 * (vista `participacion_por_edificio`), si tiene cuenta bancaria y el cierre
 * del mes en curso (vista `cierre_por_edificio`, PB-21).
 *
 * Supuesto: un edificio está listo para cobrar cuando tiene unidades, su
 * participación suma exactamente 100 % y tiene una cuenta bancaria. Es lo que
 * el cierre necesita para prorratear y para decir dónde pagar (PB-17).
 */

/** Lo que la base sabe del padrón de un edificio. */
export interface EstadoDelPadron {
  unidades: number;
  sinParticipacion: number;
  /** Suma de las participaciones puestas, en porcentaje. */
  total: number;
  sumaCien: boolean;
}

export interface EdificioDeLaCartera {
  id: string;
  nombre: string;
}

export type TipoPendiente = "sin-unidades" | "sin-participacion" | "participacion-incompleta" | "participacion-excedida" | "sin-cuenta";

/** Un pendiente dice qué pasa (la causa) y qué hacer (el siguiente paso). */
export interface Pendiente {
  tipo: TipoPendiente;
  causa: string;
  paso: string;
}

/** El cierre del mes en curso de un edificio, si ya se abrió. */
export interface CierreDelMes {
  estado: "borrador" | "emitido";
  paso: 1 | 2 | 3 | 4;
}

/** Lo que toca en el cierre del mes, y a qué paso lleva (PB-21). */
export interface PasoDelCierre {
  texto: "Cargar lecturas" | "Emitir recibos" | "Al día";
  /** El paso del cierre al que lleva, o null si no hay nada que hacer. */
  paso: 1 | 2 | 3 | 4 | null;
}

export function pasoDelCierre(cierre: CierreDelMes | null | undefined): PasoDelCierre {
  if (!cierre || (cierre.estado === "borrador" && cierre.paso === 1)) return { texto: "Cargar lecturas", paso: 1 };
  if (cierre.estado === "borrador") return { texto: "Emitir recibos", paso: cierre.paso };
  return { texto: "Al día", paso: null };
}

/** El mes en curso en Lima, como su primer día: "2026-10-01". */
export function periodoEnCurso(ahora: Date = new Date()): string {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
  return `${hoy.slice(0, 7)}-01`;
}

export interface FilaCartera {
  id: string;
  nombre: string;
  unidades: number;
  /** `null` si el edificio todavía no tiene unidades: no hay participación que sumar. */
  participacion: { total: number; sumaCien: boolean } | null;
  tieneCuenta: boolean;
  /** En el orden en que conviene resolverlos. */
  pendientes: Pendiente[];
  /** Con el padrón completo, lo que toca en el cierre del mes. */
  cierre: PasoDelCierre | null;
}

export interface Indicador {
  clave: "unidades" | "por-completar";
  etiqueta: string;
  valor: number;
}

const SIN_UNIDADES: EstadoDelPadron = { unidades: 0, sinParticipacion: 0, total: 0, sumaCien: false };

/** "92,5 %": hasta cuatro decimales, coma decimal, sin ceros de más. */
export function formatoPorcentaje(valor: number): string {
  const texto = (Math.round(valor * 10_000) / 10_000).toFixed(4).replace(/\.?0+$/, "");
  return `${texto.replace(".", ",")} %`;
}

function enPlural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/**
 * Lo que le falta al edificio, en orden: primero las unidades (sin ellas no
 * hay participación que revisar), después la participación y la cuenta.
 */
export function pendientesDelEdificio(padron: EstadoDelPadron, tieneCuenta: boolean): Pendiente[] {
  const pendientes: Pendiente[] = [];
  if (padron.unidades === 0) {
    pendientes.push({ tipo: "sin-unidades", causa: "Sin unidades registradas", paso: "Registrar unidades" });
  } else if (padron.sinParticipacion > 0) {
    pendientes.push({
      tipo: "sin-participacion",
      causa: `${enPlural(padron.sinParticipacion, "unidad", "unidades")} sin participación`,
      paso: "Completar participación",
    });
  } else if (!padron.sumaCien) {
    const excedida = padron.total > 100;
    pendientes.push({
      tipo: excedida ? "participacion-excedida" : "participacion-incompleta",
      causa: `La participación suma ${formatoPorcentaje(padron.total)}`,
      paso: excedida ? "Corregir participación" : "Completar participación",
    });
  }
  if (!tieneCuenta) {
    pendientes.push({ tipo: "sin-cuenta", causa: "Sin cuenta bancaria", paso: "Registrar cuenta bancaria" });
  }
  return pendientes;
}

/**
 * Una fila por edificio, en el orden en que llegan. A un edificio que no
 * aparece en `padron` se le cuentan cero unidades.
 */
export function armarCartera(
  edificios: readonly EdificioDeLaCartera[],
  padron: ReadonlyMap<string, EstadoDelPadron>,
  conCuenta: ReadonlySet<string>,
  cierres: ReadonlyMap<string, CierreDelMes> = new Map(),
): FilaCartera[] {
  return edificios.map((e) => {
    const estado = padron.get(e.id) ?? SIN_UNIDADES;
    const tieneCuenta = conCuenta.has(e.id);
    const pendientes = pendientesDelEdificio(estado, tieneCuenta);
    return {
      id: e.id,
      nombre: e.nombre,
      unidades: estado.unidades,
      participacion: estado.unidades > 0 ? { total: estado.total, sumaCien: estado.sumaCien } : null,
      tieneCuenta,
      pendientes,
      cierre: pendientes.length === 0 ? pasoDelCierre(cierres.get(e.id)) : null,
    };
  });
}

/**
 * Las cifras de arriba. Solo entra la que tiene algo que contar (H8): una
 * tarjeta en cero no dice nada que la tabla no diga. Recaudación, morosidad,
 * incidencias y reservas no existen en la base y no se arman.
 */
export function indicadoresDeLaCartera(filas: readonly FilaCartera[]): Indicador[] {
  const unidades = filas.reduce((suma, f) => suma + f.unidades, 0);
  const porCompletar = filas.filter((f) => f.pendientes.length > 0).length;
  const candidatos: Indicador[] = [
    { clave: "unidades", etiqueta: "Unidades registradas", valor: unidades },
    { clave: "por-completar", etiqueta: "Edificios por completar", valor: porCompletar },
  ];
  return candidatos.filter((i) => i.valor > 0);
}
