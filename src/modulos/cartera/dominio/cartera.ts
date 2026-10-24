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
  texto: "Cargar lecturas" | "Emitir recibos" | "Mes emitido";
  /** El paso del cierre al que lleva, o null si no hay nada que hacer. */
  paso: 1 | 2 | 3 | 4 | null;
}

export function pasoDelCierre(cierre: CierreDelMes | null | undefined): PasoDelCierre {
  if (!cierre || (cierre.estado === "borrador" && cierre.paso === 1)) return { texto: "Cargar lecturas", paso: 1 };
  if (cierre.estado === "borrador") return { texto: "Emitir recibos", paso: cierre.paso };
  // "Mes emitido" y no "Al día": los recibos salieron, pero eso no dice que se hayan pagado.
  return { texto: "Mes emitido", paso: null };
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

const SIN_UNIDADES: EstadoDelPadron = { unidades: 0, sinParticipacion: 0, total: 0, sumaCien: false };

/**
 * "92.5 %": hasta cuatro decimales, sin ceros de más. Con punto decimal, como
 * los montos (S/ 3,730.00) y la participación en el padrón.
 */
export function formatoPorcentaje(valor: number): string {
  const texto = (Math.round(valor * 10_000) / 10_000).toFixed(4).replace(/\.?0+$/, "");
  return `${texto} %`;
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
 * Dónde está cada edificio este mes:
 * - `por-completar`: al padrón le falta algo y no se puede cobrar.
 * - `en-cierre`: el padrón está completo y los recibos del mes no salieron.
 * - `al-dia`: los recibos del mes ya se emitieron.
 */
export type EstadoDelEdificio = "por-completar" | "en-cierre" | "al-dia";

export const TEXTO_DEL_ESTADO: Record<EstadoDelEdificio, string> = {
  "por-completar": "Por completar",
  "en-cierre": "En cierre",
  "al-dia": "Mes emitido",
};

export function estadoDelEdificio(f: Pick<FilaCartera, "pendientes" | "cierre">): EstadoDelEdificio {
  if (f.pendientes.length > 0) return "por-completar";
  return f.cierre?.paso === null ? "al-dia" : "en-cierre";
}

export interface ResumenDelMes {
  edificios: number;
  alDia: number;
  enCierre: number;
  porCompletar: number;
}

/** Cuántos edificios hay en cada estado. Lo que se mira es cuántos faltan para emitir el mes. */
export function resumenDelMes(filas: readonly FilaCartera[]): ResumenDelMes {
  const r: ResumenDelMes = { edificios: filas.length, alDia: 0, enCierre: 0, porCompletar: 0 };
  for (const f of filas) {
    const e = estadoDelEdificio(f);
    if (e === "al-dia") r.alDia += 1;
    else if (e === "en-cierre") r.enCierre += 1;
    else r.porCompletar += 1;
  }
  return r;
}

/** Algo que hay que hacer en un edificio: un pendiente del padrón o el paso del cierre. */
export interface Tarea {
  edificioId: string;
  edificio: string;
  tipo: TipoPendiente | "cierre";
  /** Qué hacer: "Completar participación", "Cargar lecturas". */
  paso: string;
  /** Por qué, o en qué punto está. */
  causa: string;
  /** Con `tipo: "cierre"`, el paso del cierre al que lleva. */
  pasoDelCierre?: 1 | 2 | 3 | 4;
}

/**
 * Lo que hay que hacer en toda la cartera. Primero los pendientes del padrón
 * (sin ellos no se puede cobrar), después el cierre de los que están listos;
 * dentro de cada grupo, en el orden de los edificios.
 */
export function tareasDeLaCartera(filas: readonly FilaCartera[]): Tarea[] {
  const delPadron = filas.flatMap((f) =>
    f.pendientes.map((p): Tarea => ({ edificioId: f.id, edificio: f.nombre, tipo: p.tipo, paso: p.paso, causa: p.causa })),
  );
  const delCierre = filas.flatMap((f): Tarea[] => {
    const paso = f.pendientes.length === 0 ? f.cierre?.paso : null;
    if (!f.cierre || !paso) return [];
    return [{ edificioId: f.id, edificio: f.nombre, tipo: "cierre", paso: f.cierre.texto, causa: `Paso ${paso} de 4 del cierre`, pasoDelCierre: paso }];
  });
  return [...delPadron, ...delCierre];
}
