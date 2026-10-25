/**
 * La cuenta donde se depositan los pagos de un edificio (tabla
 * `cuenta_bancaria`).
 *
 * Supuesto: la cuenta es del edificio, no de la administradora, y va en soles
 * o en dólares. El cierre la exige configurada antes de emitir (PB-17).
 */

export const MONEDAS = ["PEN", "USD"] as const;
export type Moneda = (typeof MONEDAS)[number];

export interface CuentaBancaria {
  id: string;
  orgId: string;
  edificioId: string;
  nombre: string;
  banco: string;
  numero: string;
  cci: string | null;
  moneda: Moneda;
}

export interface DatosCuenta {
  nombre: string;
  banco: string;
  numero: string;
  cci: string;
  moneda: Moneda;
}

export type CuentaLimpia = Omit<CuentaBancaria, "id" | "orgId" | "edificioId">;
export type ErroresCuenta = Partial<Record<keyof DatosCuenta, string>>;
export type ValidacionCuenta = { ok: true; cuenta: CuentaLimpia } | { ok: false; errores: ErroresCuenta };

export function esMoneda(valor: unknown): valor is Moneda {
  return typeof valor === "string" && (MONEDAS as readonly string[]).includes(valor);
}

function texto(valor: string): string {
  return valor.trim().replace(/\s+/g, " ");
}

export type CampoCuenta = keyof DatosCuenta;

/** El orden de los campos en el formulario: el resumen de errores lo sigue. */
export const CAMPOS_CUENTA: readonly CampoCuenta[] = ["nombre", "banco", "numero", "cci", "moneda"];

export const ETIQUETA_CAMPO_CUENTA: Record<CampoCuenta, string> = {
  nombre: "Nombre",
  banco: "Banco",
  numero: "Número de cuenta",
  cci: "CCI",
  moneda: "Moneda",
};

export const MENSAJE_CUENTA_REPETIDA = "Ya hay una cuenta con ese número en este edificio";

const NOMBRE_DE_MONEDA: Record<Moneda, string> = { PEN: "Soles", USD: "Dólares" };

/** "Soles" o "Dólares": la moneda como se dice, no su código. */
export function nombreDeMoneda(moneda: Moneda): string {
  return NOMBRE_DE_MONEDA[moneda];
}

/** El número de cuenta como lo guarda la base: sin espacios. */
export function claveDeCuenta(numero: string): string {
  return numero.replace(/\s/g, "");
}

/** Los dígitos del CCI que se llevan escritos, sin espacios ni guiones. */
export function digitosDeCci(cci: string): number {
  return cci.replace(/[\s-]/g, "").length;
}

/** "0011 0234 5678 9012 3456": el CCI en grupos de cuatro, para leerlo y dictarlo. */
export function textoDeCci(cci: string): string {
  return cci.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** Para llenar el formulario al editar: lo que la base guardó, como texto. */
export function datosDeCuenta(c?: CuentaBancaria): DatosCuenta {
  return {
    nombre: c?.nombre ?? "",
    banco: c?.banco ?? "",
    numero: c?.numero ?? "",
    cci: c?.cci ?? "",
    moneda: c?.moneda ?? "PEN",
  };
}

/**
 * Los errores del formulario. `otras` son las cuentas del mismo edificio, para
 * avisar del número repetido sin ir a la base (`unique (org_id, edificio_id,
 * numero)`); `idEditado`, la que se edita, que no choca consigo misma.
 */
export function validarCuenta(
  datos: DatosCuenta,
  otras: readonly Pick<CuentaBancaria, "id" | "numero">[] = [],
  idEditado?: string,
): ValidacionCuenta {
  const errores: ErroresCuenta = {};

  const nombre = texto(datos.nombre);
  if (nombre === "") errores.nombre = "Ponle un nombre, por ejemplo Cuenta principal";
  else if (nombre.length > 80) errores.nombre = "Usa hasta 80 caracteres";

  const banco = texto(datos.banco);
  if (banco === "") errores.banco = "Falta el banco";
  else if (banco.length > 80) errores.banco = "Usa hasta 80 caracteres";

  const numero = datos.numero.replace(/\s/g, "");
  if (numero === "") errores.numero = "Falta el número de cuenta";
  else if (!/^[0-9][0-9-]{4,28}[0-9]$/.test(numero)) errores.numero = "Usa solo números y guiones, de 6 a 30 caracteres";
  else if (otras.some((c) => c.id !== idEditado && claveDeCuenta(c.numero) === numero)) errores.numero = MENSAJE_CUENTA_REPETIDA;

  const cci = datos.cci.replace(/[\s-]/g, "");
  if (cci !== "" && !/^\d+$/.test(cci)) errores.cci = "Usa solo números";
  else if (cci !== "" && cci.length !== 20) errores.cci = `El CCI tiene 20 dígitos y llevas ${cci.length}`;

  if (!esMoneda(datos.moneda)) errores.moneda = "Elige soles o dólares";

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, cuenta: { nombre, banco, numero, cci: cci || null, moneda: datos.moneda } };
}

/** Los errores en el orden del formulario, para el resumen de arriba. */
export function listaDeErroresCuenta(errores: ErroresCuenta): { campo: CampoCuenta; etiqueta: string; mensaje: string }[] {
  return CAMPOS_CUENTA.flatMap((campo) => {
    const mensaje = errores[campo];
    return mensaje ? [{ campo, etiqueta: ETIQUETA_CAMPO_CUENTA[campo], mensaje }] : [];
  });
}
