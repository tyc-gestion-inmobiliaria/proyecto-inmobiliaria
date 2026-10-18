/**
 * El estado de cada edificio de la cartera y lo que falta para poder cobrarle
 * (PB-11, H1 y H8). Reglas puras, sin React ni Supabase.
 *
 * Solo se arma con lo que hoy existe en la base: unidades, la suma de
 * participaciones (vista `participacion_por_edificio`) y si tiene cuenta
 * bancaria. Lo que depende de cobranza, recibos o lecturas no existe todavía
 * y no se calcula ni se muestra.
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

export interface FilaCartera {
  id: string;
  nombre: string;
  unidades: number;
  /** `null` si el edificio todavía no tiene unidades: no hay participación que sumar. */
  participacion: { total: number; sumaCien: boolean } | null;
  tieneCuenta: boolean;
  /** En el orden en que conviene resolverlos. */
  pendientes: Pendiente[];
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
): FilaCartera[] {
  return edificios.map((e) => {
    const estado = padron.get(e.id) ?? SIN_UNIDADES;
    const tieneCuenta = conCuenta.has(e.id);
    return {
      id: e.id,
      nombre: e.nombre,
      unidades: estado.unidades,
      participacion: estado.unidades > 0 ? { total: estado.total, sumaCien: estado.sumaCien } : null,
      tieneCuenta,
      pendientes: pendientesDelEdificio(estado, tieneCuenta),
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
