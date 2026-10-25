/**
 * La lectura del medidor de agua de una unidad en el cierre (PB-14).
 *
 * Supuesto: un solo servicio medido, agua. El consumo es actual − anterior;
 * una lectura menor que la anterior no se guarda (el medidor no retrocede) y
 * el aviso va en la fila, con su causa.
 */

export interface Lectura {
  id: string;
  unidadId: string;
  unidadNumero: string;
  anterior: number | null;
  actual: number | null;
  /** Ruta en el bucket privado `lecturas`. */
  foto: string | null;
  /** Quién cargó por última vez la actual o la foto (su correo), si se sabe. Lo pone la base. */
  tomadaPor?: string | null;
  /** Cuándo, ISO 8601. */
  tomadaEn?: string | null;
}

export type TipoDeAviso = "vacia" | "menor" | "sin-anterior" | "invalida";

export interface AvisoDeLectura {
  tipo: TipoDeAviso;
  texto: string;
  /** Si impide guardar la fila. */
  bloquea: boolean;
}

const METROS = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 });

/** "12.5 m³". */
export function textoDeMetros(valor: number | null): string {
  return valor === null ? "—" : `${METROS.format(valor)} m³`;
}

/** Lee lo que se escribe en la celda: "123", "123.5" o "123,5". Vacío es null. */
export function leerMedida(texto: string): number | null | "invalida" {
  const t = texto.trim().replace(",", ".");
  if (t === "") return null;
  if (!/^\d+(\.\d{1,3})?$/.test(t)) return "invalida";
  return Number(t);
}

export function consumo(anterior: number | null, actual: number | null): number | null {
  if (anterior === null || actual === null || actual < anterior) return null;
  return Math.round((actual - anterior) * 1000) / 1000;
}

/** El aviso de la fila, o null si la lectura está bien. */
export function avisoDeLectura(anterior: number | null | "invalida", actual: number | null | "invalida"): AvisoDeLectura | null {
  if (actual === "invalida" || anterior === "invalida") {
    return { tipo: "invalida", texto: "Escribe solo números, con hasta tres decimales", bloquea: true };
  }
  if (actual === null) return { tipo: "vacia", texto: "Sin lectura: no paga agua este mes", bloquea: false };
  if (anterior === null) return { tipo: "sin-anterior", texto: "Falta la lectura anterior para calcular el consumo", bloquea: false };
  if (actual < anterior) {
    return { tipo: "menor", texto: `Es menor que la anterior (${METROS.format(anterior)}): revisa el número o la foto`, bloquea: true };
  }
  return null;
}

/** "12 de 14 con lectura". */
export function avanceDeLecturas(lecturas: readonly Pick<Lectura, "actual">[]): { con: number; total: number; texto: string } {
  const con = lecturas.filter((l) => l.actual !== null).length;
  return { con, total: lecturas.length, texto: `${con} de ${lecturas.length} con lectura` };
}

/** Dónde guarda la foto el bucket: una carpeta por administradora, como pide su política. */
export function rutaDeFoto(orgId: string, cierreId: string, unidadId: string, extension: string): string {
  return `${orgId}/${cierreId}/${unidadId}.${extension.replace(/^\./, "").toLowerCase()}`;
}
