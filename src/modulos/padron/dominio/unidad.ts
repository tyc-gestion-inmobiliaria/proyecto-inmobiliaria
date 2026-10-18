/**
 * Una unidad de un edificio: departamento, local u otro inmueble (tabla
 * `unidad`). "Unidad", nunca "bloque inmobiliario" (H2).
 *
 * El tipo es texto libre porque la lista de tipos está por confirmar con el
 * cliente; el área va en m² y la participación en porcentaje.
 */
export interface Unidad {
  id: string;
  orgId: string;
  edificioId: string;
  numero: string;
  tipo: string | null;
  areaM2: number | null;
  participacion: number | null;
}

/** Ordena como se leen en un edificio: "2" antes que "10", "A-2" antes que "A-10". */
export function compararNumeroDeUnidad(a: string, b: string): number {
  return a.localeCompare(b, "es", { numeric: true, sensitivity: "base" });
}
