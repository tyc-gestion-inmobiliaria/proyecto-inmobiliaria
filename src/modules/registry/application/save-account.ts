/**
 * Caso de uso: registrar o editar una cuenta bancaria del edificio.
 *
 * Valida antes de mandar (el error va junto al campo, H9) y traduce el
 * rechazo de la base: el número repetido cae en el campo Número de cuenta;
 * lo demás (permiso, red) va como mensaje general sobre los botones.
 */
import {
  MENSAJE_CUENTA_REPETIDA,
  validarCuenta,
  type CuentaBancaria,
  type DatosCuenta,
  type ErroresCuenta,
} from "../domain/bank-account";
import { mensajeDelFallo } from "./messages";
import type { CuentasBancariasPuerto } from "./ports";

export type ResultadoGuardarCuenta = { ok: true; cuenta: CuentaBancaria } | { ok: false; errores: ErroresCuenta; general?: string };

export async function guardarCuenta(
  cuentas: CuentasBancariasPuerto,
  {
    orgId,
    edificioId,
    datos,
    otras = [],
    id,
  }: {
    orgId: string;
    edificioId: string;
    datos: DatosCuenta;
    /** Las cuentas del edificio, para avisar del número repetido sin ir a la base. */
    otras?: readonly Pick<CuentaBancaria, "id" | "numero">[];
    /** Con `id` se edita esa cuenta; sin él, se registra una nueva. */
    id?: string;
  },
): Promise<ResultadoGuardarCuenta> {
  const v = validarCuenta(datos, otras, id);
  if (!v.ok) return { ok: false, errores: v.errores };

  const r = id ? await cuentas.actualizar(orgId, id, v.cuenta) : await cuentas.crear(orgId, edificioId, v.cuenta);
  if (r.ok) return { ok: true, cuenta: r.valor };
  if (r.fallo === "repetido") return { ok: false, errores: { numero: MENSAJE_CUENTA_REPETIDA } };
  return { ok: false, errores: {}, general: mensajeDelFallo(r.fallo) };
}
