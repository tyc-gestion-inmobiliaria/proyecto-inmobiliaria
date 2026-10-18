/**
 * Una unidad de un edificio: departamento, local u otro inmueble (tabla
 * `unidad`). "Unidad", nunca "bloque inmobiliario" (H2).
 *
 * El tipo es texto libre porque la lista de tipos está por confirmar con el
 * cliente; el área va en m² y la participación en porcentaje.
 *
 * Las reglas del formulario (PB-08) son las de la tabla: número de 1 a 20
 * caracteres y único en el edificio, tipo hasta 40, área positiva con dos
 * decimales (`numeric(10,2)`), participación de 0 a 100 con cuatro
 * (`numeric(7,4)`). Se comprueban acá para responder junto al campo; la base
 * las vuelve a comprobar.
 *
 * Supuesto: "101" y " 101 ", o "a-1" y "A-1", son la misma unidad. La base
 * solo rechaza el número idéntico; acá se avisa también del parecido.
 */
import { leerParticipacion } from "./participacion";

export interface Unidad {
  id: string;
  orgId: string;
  edificioId: string;
  numero: string;
  tipo: string | null;
  areaM2: number | null;
  participacion: number | null;
}

/** Lo que se escribe en el formulario, tal cual. */
export interface DatosUnidad {
  numero: string;
  tipo: string;
  area: string;
  participacion: string;
}

/** Lo que se guarda. */
export type UnidadLimpia = Omit<Unidad, "id" | "orgId" | "edificioId">;

export type CampoUnidad = keyof DatosUnidad;
export type ErroresUnidad = Partial<Record<CampoUnidad, string>>;
export type ValidacionUnidad = { ok: true; unidad: UnidadLimpia } | { ok: false; errores: ErroresUnidad };

/** El orden de los campos en el formulario: el resumen de errores lo sigue. */
export const CAMPOS_UNIDAD: readonly CampoUnidad[] = ["numero", "tipo", "area", "participacion"];

export const ETIQUETA_CAMPO_UNIDAD: Record<CampoUnidad, string> = {
  numero: "Número",
  tipo: "Tipo",
  area: "Área",
  participacion: "Participación",
};

export const MENSAJE_NUMERO_REPETIDO = "Ya hay una unidad con ese número en este edificio.";

/** Ordena como se leen en un edificio: "2" antes que "10", "A-2" antes que "A-10". */
export function compararNumeroDeUnidad(a: string, b: string): number {
  return a.localeCompare(b, "es", { numeric: true, sensitivity: "base" });
}

export function ordenarUnidades<T extends Pick<Unidad, "numero">>(unidades: readonly T[]): T[] {
  return [...unidades].sort((a, b) => compararNumeroDeUnidad(a.numero, b.numero));
}

function texto(valor: string): string {
  return valor.trim().replace(/\s+/g, " ");
}

/** La clave con la que se comparan dos números de unidad. */
export function claveDeNumero(numero: string): string {
  return texto(numero).toLocaleLowerCase("es");
}

export type LecturaArea = { ok: true; valor: number | null } | { ok: false; error: string };

/** El área en m². Vacío es "sin área". Acepta coma o punto y "m2" o "m²" al final. */
export function leerArea(valor: string): LecturaArea {
  const limpio = valor.trim().replace(/\s*m[2²]$/i, "").replace(",", ".");
  if (limpio === "") return { ok: true, valor: null };
  if (!/^\d+(\.\d+)?$/.test(limpio)) return { ok: false, error: "Escribe los m², por ejemplo 85,5" };
  const [entera, decimales = ""] = limpio.split(".");
  if (decimales.length > 2) return { ok: false, error: "Usa hasta dos decimales" };
  if (entera.replace(/^0+/, "").length > 8) return { ok: false, error: "El área es demasiado grande" };
  const numero = Number(limpio);
  if (numero <= 0) return { ok: false, error: "El área tiene que ser mayor que 0" };
  return { ok: true, valor: numero };
}

/**
 * Los errores del formulario. `otras` son las unidades del mismo edificio;
 * `idEditado`, la que se edita, que no choca consigo misma.
 */
export function validarUnidad(
  datos: DatosUnidad,
  otras: readonly Pick<Unidad, "id" | "numero">[] = [],
  idEditado?: string,
): ValidacionUnidad {
  const errores: ErroresUnidad = {};

  const numero = texto(datos.numero);
  if (numero === "") errores.numero = "Escribe el número de la unidad, por ejemplo 101";
  else if (numero.length > 20) errores.numero = "Usa hasta 20 caracteres";
  else if (otras.some((u) => u.id !== idEditado && claveDeNumero(u.numero) === claveDeNumero(numero)))
    errores.numero = MENSAJE_NUMERO_REPETIDO;

  const tipo = texto(datos.tipo);
  if (tipo.length > 40) errores.tipo = "Usa hasta 40 caracteres";

  const area = leerArea(datos.area);
  if (!area.ok) errores.area = area.error;

  const participacion = leerParticipacion(datos.participacion);
  if (!participacion.ok) errores.participacion = participacion.error;

  if (!area.ok || !participacion.ok || Object.keys(errores).length > 0) return { ok: false, errores };
  return {
    ok: true,
    unidad: { numero, tipo: tipo || null, areaM2: area.valor, participacion: participacion.valor },
  };
}

/** Los errores en el orden del formulario, para el resumen de arriba. */
export function listaDeErroresUnidad(errores: ErroresUnidad): { campo: CampoUnidad; etiqueta: string; mensaje: string }[] {
  return CAMPOS_UNIDAD.flatMap((campo) => {
    const mensaje = errores[campo];
    return mensaje ? [{ campo, etiqueta: ETIQUETA_CAMPO_UNIDAD[campo], mensaje }] : [];
  });
}

const AREA = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });

/** Para llenar el formulario al editar: lo que la base guardó, como texto. */
export function datosDeUnidad(u?: Unidad): DatosUnidad {
  return {
    numero: u?.numero ?? "",
    tipo: u?.tipo ?? "",
    area: u?.areaM2 == null ? "" : String(u.areaM2),
    participacion: u?.participacion == null ? "" : String(u.participacion),
  };
}

export function textoDeArea(area: number | null): string {
  return area === null ? "—" : `${AREA.format(area)} m²`;
}

/**
 * Quién puede dar de alta y editar unidades, personas y vínculos: el
 * administrador, como en las políticas de `unidad`, `persona` y
 * `unidad_persona`. El personal solo lee, y a él no se le ofrece un botón
 * que la base va a rechazar.
 */
export function puedeEditarPadron(rol: string): boolean {
  return rol === "administrador";
}
