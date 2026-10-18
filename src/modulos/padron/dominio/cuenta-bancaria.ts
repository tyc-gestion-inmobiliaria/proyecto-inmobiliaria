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

export function validarCuenta(datos: DatosCuenta): ValidacionCuenta {
  const errores: ErroresCuenta = {};

  const nombre = texto(datos.nombre);
  if (nombre === "") errores.nombre = "Ponle un nombre, por ejemplo Cuenta principal";
  else if (nombre.length > 80) errores.nombre = "Usa hasta 80 caracteres";

  const banco = texto(datos.banco);
  if (banco === "") errores.banco = "Falta el banco";
  else if (banco.length > 80) errores.banco = "Usa hasta 80 caracteres";

  const numero = datos.numero.replace(/\s/g, "");
  if (numero === "") errores.numero = "Falta el número de cuenta";
  else if (!/^[0-9][0-9-]{4,28}[0-9]$/.test(numero)) errores.numero = "Usa solo números y guiones";

  const cci = datos.cci.replace(/[\s-]/g, "");
  if (cci !== "" && !/^\d{20}$/.test(cci)) errores.cci = "El CCI tiene 20 dígitos";

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, cuenta: { nombre, banco, numero, cci: cci || null, moneda: datos.moneda } };
}
