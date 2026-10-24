/**
 * Las áreas comunes de un edificio y sus reservas.
 *
 * - Supuesto: solo reserva una unidad al día (sin deuda vencida). Es la
 *   regla que la plataforma actual ya aplica ("reservas atadas a deuda"),
 *   pero su detalle (desde cuánto, si cuenta la mora) no está confirmado.
 * - Supuesto: se reserva por turnos fijos (mañana, tarde, noche), no por
 *   horas sueltas. Sin confirmar con el cliente.
 * - Supuesto: una reserva nueva queda Pendiente hasta que la administración
 *   la confirma. Una pendiente o confirmada se puede cancelar.
 * - Supuesto: se reserva con hasta dos semanas de anticipación
 *   (`ANTICIPACION_DIAS`). Sin confirmar.
 * - Un turno de un área no se reserva dos veces el mismo día (las
 *   canceladas no cuentan).
 */

export const ESTADOS = ["pendiente", "confirmada", "cancelada"] as const;
export type EstadoDeReserva = (typeof ESTADOS)[number];

export const TURNOS = ["manana", "tarde", "noche"] as const;
export type Turno = (typeof TURNOS)[number];

export const TEXTO_DEL_TURNO: Record<Turno, string> = { manana: "Mañana", tarde: "Tarde", noche: "Noche" };
export const HORARIO_DEL_TURNO: Record<Turno, string> = { manana: "08:00–13:00", tarde: "13:00–18:00", noche: "18:00–22:00" };

export const TEXTO_DEL_ESTADO: Record<EstadoDeReserva, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

export const ANTICIPACION_DIAS = 14;

/** Los días que se pueden reservar, de hoy en adelante (fechas ISO). */
export function diasReservables(hoy: string, dias = ANTICIPACION_DIAS): string[] {
  const [a, m, d] = hoy.split("-").map(Number);
  return Array.from({ length: dias + 1 }, (_, i) => new Date(Date.UTC(a, m - 1, d + i)).toISOString().slice(0, 10));
}

export interface AreaComun {
  id: string;
  edificioId: string;
  nombre: string;
  /** Cuántas personas caben. */
  aforo: number;
}

export interface Reserva {
  id: string;
  edificioId: string;
  areaId: string;
  unidadId: string;
  unidadNumero: string;
  /** Fecha ISO. */
  fecha: string;
  turno: Turno;
  estado: EstadoDeReserva;
}

export type AccionDeReserva = "confirmar" | "cancelar";

export function accionesDeLaReserva(estado: EstadoDeReserva): AccionDeReserva[] {
  if (estado === "pendiente") return ["confirmar", "cancelar"];
  if (estado === "confirmada") return ["cancelar"];
  return [];
}

export function estadoTrasLaAccion(accion: AccionDeReserva): EstadoDeReserva {
  return accion === "confirmar" ? "confirmada" : "cancelada";
}

export function puedeCambiar(de: EstadoDeReserva, a: EstadoDeReserva): boolean {
  return accionesDeLaReserva(de).some((x) => estadoTrasLaAccion(x) === a);
}

/** Los turnos de un área ya tomados en una fecha. */
export function turnosOcupados(reservas: readonly Reserva[], areaId: string, fecha: string): Set<Turno> {
  return new Set(reservas.filter((r) => r.areaId === areaId && r.fecha === fecha && r.estado !== "cancelada").map((r) => r.turno));
}

/** Las de hoy en adelante, por fecha y turno. */
export function proximas(reservas: readonly Reserva[], hoy: string): Reserva[] {
  return reservas.filter((r) => r.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha) || TURNOS.indexOf(a.turno) - TURNOS.indexOf(b.turno));
}

/** Agrupa por fecha, en el orden en que llegan. */
export function porDia(reservas: readonly Reserva[]): { fecha: string; reservas: Reserva[] }[] {
  const grupos: { fecha: string; reservas: Reserva[] }[] = [];
  for (const r of reservas) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.fecha === r.fecha) ultimo.reservas.push(r);
    else grupos.push({ fecha: r.fecha, reservas: [r] });
  }
  return grupos;
}

export interface DatosDeReserva {
  areaId: string | undefined;
  unidadId: string | undefined;
  fecha: string | undefined;
  turno: Turno | undefined;
}

export type ErroresDeReserva = Partial<Record<keyof DatosDeReserva, string>>;

export interface ContextoDeReserva {
  hoy: string;
  reservas: readonly Reserva[];
  /** Las unidades del edificio con su número y si están al día. */
  unidades: readonly { id: string; numero: string; alDia: boolean }[];
}

/** El aviso de la unidad, para ponerlo junto al campo apenas se elige. */
export function avisoDeLaUnidad(unidadId: string | undefined, unidades: ContextoDeReserva["unidades"]): string | undefined {
  const u = unidades.find((x) => x.id === unidadId);
  if (u && !u.alDia) return `La unidad ${u.numero} tiene deuda vencida: podrá reservar cuando se ponga al día.`;
  return undefined;
}

export function validarReserva(d: DatosDeReserva, ctx: ContextoDeReserva): ErroresDeReserva {
  const e: ErroresDeReserva = {};
  if (!d.areaId) e.areaId = "Elige el área.";
  if (!d.unidadId) e.unidadId = "Elige la unidad.";
  else e.unidadId = avisoDeLaUnidad(d.unidadId, ctx.unidades);
  if (!d.fecha) e.fecha = "Elige el día.";
  else if (d.fecha < ctx.hoy) e.fecha = "El día ya pasó.";
  else if (!diasReservables(ctx.hoy).includes(d.fecha)) e.fecha = `Se reserva con hasta ${ANTICIPACION_DIAS} días de anticipación.`;
  if (!d.turno) e.turno = "Elige el turno.";
  else if (d.areaId && d.fecha && turnosOcupados(ctx.reservas, d.areaId, d.fecha).has(d.turno)) e.turno = "Ese turno ya está reservado.";
  for (const k of Object.keys(e) as (keyof ErroresDeReserva)[]) if (!e[k]) delete e[k];
  return e;
}
