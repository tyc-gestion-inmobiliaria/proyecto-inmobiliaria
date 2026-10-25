/**
 * Una persona del padrón: propietario, inquilino o residente de una o varias
 * unidades. Sus datos son personales (Ley 29733): solo los lee el equipo de
 * la administradora y la propia persona.
 *
 * Las reglas son las de la tabla `persona`; se comprueban acá para responder
 * junto al campo antes de mandar nada, y la base las vuelve a comprobar.
 *
 * Supuesto: los largos de DNI (8 dígitos) y RUC (11) son los de Perú; carné
 * de extranjería y pasaporte aceptan de 4 a 20 letras y números.
 */

export const TIPOS_DOCUMENTO = ["dni", "ce", "pasaporte", "ruc"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

const NOMBRE_DEL_DOCUMENTO: Record<TipoDocumento, string> = {
  dni: "DNI",
  ce: "Carné de extranjería",
  pasaporte: "Pasaporte",
  ruc: "RUC",
};

export interface Persona {
  id: string;
  orgId: string;
  nombre: string;
  documentoTipo: TipoDocumento | null;
  documentoNumero: string | null;
  correo: string | null;
  telefono: string | null;
  /** La cuenta con la que entra, si la tiene. */
  usuarioId: string | null;
}

/** Lo que se escribe en el formulario, tal cual. */
export interface DatosPersona {
  nombre: string;
  documentoTipo: TipoDocumento | "";
  documentoNumero: string;
  correo: string;
  telefono: string;
}

/** Lo que se guarda. */
export type PersonaLimpia = Omit<Persona, "id" | "orgId" | "usuarioId">;

export type CampoPersona = keyof DatosPersona;
export type ErroresPersona = Partial<Record<CampoPersona, string>>;

export type ValidacionPersona = { ok: true; persona: PersonaLimpia } | { ok: false; errores: ErroresPersona };

export function esTipoDocumento(valor: unknown): valor is TipoDocumento {
  return typeof valor === "string" && (TIPOS_DOCUMENTO as readonly string[]).includes(valor);
}

export function nombreDelDocumento(tipo: TipoDocumento): string {
  return NOMBRE_DEL_DOCUMENTO[tipo];
}

const FORMA_DEL_DOCUMENTO: Record<TipoDocumento, { patron: RegExp; error: string }> = {
  dni: { patron: /^\d{8}$/, error: "El DNI tiene 8 dígitos" },
  ruc: { patron: /^\d{11}$/, error: "El RUC tiene 11 dígitos" },
  ce: { patron: /^[A-Z0-9]{4,20}$/, error: "Usa de 4 a 20 letras y números" },
  pasaporte: { patron: /^[A-Z0-9]{4,20}$/, error: "Usa de 4 a 20 letras y números" },
};

const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const TELEFONO = /^\+?[0-9 ()-]{6,20}$/;

function sinEspaciosDobles(texto: string): string {
  return texto.trim().replace(/\s+/g, " ");
}

export function validarPersona(datos: DatosPersona): ValidacionPersona {
  const errores: ErroresPersona = {};

  const nombre = sinEspaciosDobles(datos.nombre);
  if (nombre === "") errores.nombre = "Falta el nombre";
  else if (nombre.length > 200) errores.nombre = "Usa hasta 200 caracteres";

  const numero = datos.documentoNumero.replace(/[\s.-]/g, "").toUpperCase();
  const tipo = datos.documentoTipo === "" ? null : datos.documentoTipo;
  if (tipo && numero === "") errores.documentoNumero = "Falta el número de documento";
  else if (!tipo && numero !== "") errores.documentoTipo = "Elige el tipo de documento";
  else if (tipo && !FORMA_DEL_DOCUMENTO[tipo].patron.test(numero)) errores.documentoNumero = FORMA_DEL_DOCUMENTO[tipo].error;

  const correo = datos.correo.trim().toLowerCase();
  if (correo !== "" && (correo.length > 254 || !CORREO.test(correo))) errores.correo = "Revisa el correo, falta algo";

  const telefono = sinEspaciosDobles(datos.telefono);
  if (telefono !== "" && !TELEFONO.test(telefono)) errores.telefono = "Usa solo números, espacios y el + del código de país";

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return {
    ok: true,
    persona: {
      nombre,
      documentoTipo: tipo,
      documentoNumero: tipo ? numero : null,
      correo: correo || null,
      telefono: telefono || null,
    },
  };
}

export const CAMPOS_PERSONA: readonly CampoPersona[] = ["nombre", "documentoTipo", "documentoNumero", "correo", "telefono"];

export const ETIQUETA_CAMPO_PERSONA: Record<CampoPersona, string> = {
  nombre: "Nombre",
  documentoTipo: "Tipo de documento",
  documentoNumero: "Número de documento",
  correo: "Correo",
  telefono: "Teléfono",
};

/** Para llenar el formulario al editar. Sin persona, el formulario vacío. */
export function datosDePersona(p?: Persona): DatosPersona {
  return {
    nombre: p?.nombre ?? "",
    documentoTipo: p?.documentoTipo ?? "",
    documentoNumero: p?.documentoNumero ?? "",
    correo: p?.correo ?? "",
    telefono: p?.telefono ?? "",
  };
}
