/**
 * Las cuentas de `ScheduleGrid`, puras para probarlas sin React Native.
 *
 * Las horas van en minutos desde la medianoche: 570 es 09:30.
 */

export interface ScheduleRange {
  start: number;
  end: number;
}

/** 570 → "09:30". */
export function minuteLabel(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function overlaps(a: ScheduleRange, b: ScheduleRange): boolean {
  return a.start < b.end && b.start < a.end;
}

export type SlotState = "free" | "busy" | "closed";

export interface Slot {
  start: number;
  end: number;
  state: SlotState;
}

/**
 * Las franjas de una columna, de `start` a `end` cada `step` minutos:
 *
 * - **closed** si no cae entera dentro de un tramo abierto (fuera de horario);
 * - **busy** si algo que ocupa la pisa;
 * - **free** si no: es la que se puede tocar para agregar algo ahí.
 *
 * Sin `open`, toda la columna está abierta.
 */
export function buildSlots(start: number, end: number, step: number, open: ScheduleRange[] | undefined, busy: ScheduleRange[]): Slot[] {
  const out: Slot[] = [];
  for (let m = start; m < end; m += step) {
    const slot = { start: m, end: Math.min(end, m + step) };
    const inside = !open || open.some((r) => r.start <= slot.start && slot.end <= r.end);
    const state: SlotState = !inside ? "closed" : busy.some((b) => overlaps(b, slot)) ? "busy" : "free";
    out.push({ ...slot, state });
  }
  return out;
}

export interface Lane {
  lane: number;
  lanes: number;
}

/**
 * Reparte en carriles lo que se cruza en una misma columna, para que nada
 * tape a nada: cada grupo de cosas que se pisan entre sí se divide el ancho
 * en tantos carriles como hagan falta, y cada una toma el primero libre.
 */
export function layoutLanes<T extends ScheduleRange & { key: string }>(items: T[]): Map<string, Lane> {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const out = new Map<string, Lane>();
  let group: { key: string; lane: number }[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -Infinity;
  const close = () => {
    for (const g of group) out.set(g.key, { lane: g.lane, lanes: laneEnds.length });
    group = [];
    laneEnds = [];
  };
  for (const it of sorted) {
    if (it.start >= groupEnd) {
      close();
      groupEnd = -Infinity;
    }
    let lane = laneEnds.findIndex((e) => e <= it.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(it.end);
    } else laneEnds[lane] = it.end;
    group.push({ key: it.key, lane });
    groupEnd = Math.max(groupEnd, it.end);
  }
  close();
  return out;
}

/** Las horas en punto entre `start` y `end`, para las marcas del costado. */
export function hourMarks(start: number, end: number): number[] {
  const out: number[] = [];
  for (let m = Math.ceil(start / 60) * 60; m <= end; m += 60) out.push(m);
  return out;
}

/** Cuántos píxeles desde arriba le tocan a un minuto. */
export function minuteToY(minute: number, start: number, step: number, slotHeight: number): number {
  return ((minute - start) / step) * slotHeight;
}
