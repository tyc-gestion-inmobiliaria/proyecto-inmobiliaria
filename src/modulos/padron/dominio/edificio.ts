/**
 * Un edificio de la cartera y lo que se comprueba de su formulario (PB-07).
 *
 * Las reglas son las de la tabla `edificio`: el nombre es obligatorio, hasta
 * 200 caracteres y no se repite dentro de la administradora; la dirección es
 * opcional, hasta 300. Se comprueban acá para responder junto al campo antes
 * de mandar nada (H9); la base las vuelve a comprobar porque el cliente no es
 * de confianza.
 *
 * Supuesto: dos nombres que solo difieren en mayúsculas o espacios son el
 * mismo edificio. La base solo rechaza el nombre idéntico; acá se avisa
 * también del parecido, para que no queden "Torre Sol" y "torre sol".
 */

export interface Edificio {
  id: string;
  orgId: string;
  nombre: string;
  direccion: string | null;
}

/** Lo que la persona escribe en el formulario, tal cual. */
export interface DatosEdificio {
  nombre: string;
  direccion: string;
}

/** Lo que se guarda: recortado, sin espacios dobles y sin dirección vacía. */
export interface EdificioLimpio {
  nombre: string;
  direccion: string | null;
}

export type CampoEdificio = keyof DatosEdificio;

export type ErroresEdificio = Partial<Record<CampoEdificio, string>>;

export const LARGO_MAXIMO: Record<CampoEdificio, number> = { nombre: 200, direccion: 300 };

/** El orden de los campos en el formulario: el resumen de errores lo sigue. */
export const CAMPOS_EDIFICIO: readonly CampoEdificio[] = ["nombre", "direccion"];

export const ETIQUETA_CAMPO: Record<CampoEdificio, string> = { nombre: "Nombre", direccion: "Dirección" };

function limpiarTexto(texto: string): string {
  return texto.trim().replace(/\s+/g, " ");
}

export function limpiarEdificio({ nombre, direccion }: DatosEdificio): EdificioLimpio {
  const dir = limpiarTexto(direccion);
  return { nombre: limpiarTexto(nombre), direccion: dir ? dir : null };
}

/** La clave con la que se comparan dos nombres. */
export function claveDeNombre(nombre: string): string {
  return limpiarTexto(nombre).toLocaleLowerCase("es");
}

/**
 * Los errores del formulario, campo por campo. `otros` son los edificios ya
 * registrados de la administradora; `idEditado`, el que se está editando,
 * que no choca consigo mismo.
 */
export function validarEdificio(
  datos: DatosEdificio,
  otros: readonly Pick<Edificio, "id" | "nombre">[] = [],
  idEditado?: string,
): ErroresEdificio {
  const errores: ErroresEdificio = {};
  const { nombre, direccion } = limpiarEdificio(datos);

  if (!nombre) errores.nombre = "Escribe el nombre del edificio.";
  else if (nombre.length > LARGO_MAXIMO.nombre)
    errores.nombre = `El nombre tiene ${nombre.length} caracteres; acorta a ${LARGO_MAXIMO.nombre} o menos.`;
  else if (otros.some((e) => e.id !== idEditado && claveDeNombre(e.nombre) === claveDeNombre(nombre)))
    errores.nombre = MENSAJE_NOMBRE_REPETIDO;

  if (direccion && direccion.length > LARGO_MAXIMO.direccion)
    errores.direccion = `La dirección tiene ${direccion.length} caracteres; acorta a ${LARGO_MAXIMO.direccion} o menos.`;

  return errores;
}

export const MENSAJE_NOMBRE_REPETIDO = "Ya hay un edificio con ese nombre. Usa otro o edita el que existe.";

export function hayErrores(errores: ErroresEdificio): boolean {
  return CAMPOS_EDIFICIO.some((c) => Boolean(errores[c]));
}

/** Los errores en el orden del formulario, para el resumen de arriba. */
export function listaDeErrores(errores: ErroresEdificio): { campo: CampoEdificio; etiqueta: string; mensaje: string }[] {
  return CAMPOS_EDIFICIO.flatMap((campo) => {
    const mensaje = errores[campo];
    return mensaje ? [{ campo, etiqueta: ETIQUETA_CAMPO[campo], mensaje }] : [];
  });
}

/** Por nombre, como se busca en una lista. */
export function ordenarEdificios<T extends Pick<Edificio, "nombre">>(edificios: readonly T[]): T[] {
  return [...edificios].sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base", numeric: true }));
}

/**
 * Quién puede dar de alta y editar edificios: el administrador, igual que en
 * las políticas `edificio_alta` y `edificio_edicion`. Los demás roles solo
 * leen, y a ellos no se les ofrece un botón que la base va a rechazar.
 */
export function puedeEditarEdificios(rol: string): boolean {
  return rol === "administrador";
}
