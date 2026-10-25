/**
 * El dinero del edificio en el mes: lo que entra, lo que sale y cómo queda
 * cada fondo. Montos en céntimos enteros; con base, los totales los calcula
 * Postgres (`numeric(12,2)`) y esto solo adelanta el aviso al escribir.
 *
 * - Un fondo es una reserva de dinero del edificio con su propósito
 *   (operación, reserva). El glosario dice "fondo", no "bolsa".
 * - Supuesto: un egreso sale de un solo fondo y no puede dejarlo en
 *   negativo. Sin confirmar con el cliente.
 * - Supuesto: un egreso se registra con fecha del mes en curso y no
 *   posterior a hoy (el mes cerrado no se toca: se corrige con un ajuste).
 */

export type TipoDeMovimiento = "ingreso" | "egreso";

export interface Fondo {
  id: string;
  edificioId: string;
  nombre: string;
  /** Saldo al empezar el mes, en céntimos. */
  saldoInicial: number;
}

export interface Movimiento {
  id: string;
  edificioId: string;
  fondoId: string;
  tipo: TipoDeMovimiento;
  /** Fecha ISO. */
  fecha: string;
  concepto: string;
  /** Céntimos, siempre positivo; el tipo dice si suma o resta. */
  monto: number;
  proveedor: string | null;
}

export interface FondoDelMes {
  fondo: Fondo;
  ingresos: number;
  egresos: number;
  saldo: number;
}

export interface ResumenDelMes {
  /** "AAAA-MM". */
  periodo: string;
  ingresos: number;
  egresos: number;
  /** Ingresos menos egresos; negativo si salió más de lo que entró. */
  resultado: number;
  fondos: FondoDelMes[];
  /** Los del mes, el último primero. */
  movimientos: Movimiento[];
}

export function resumenDelMes(periodo: string, fondos: readonly Fondo[], movimientos: readonly Movimiento[]): ResumenDelMes {
  const delMes = movimientos.filter((m) => m.fecha.startsWith(periodo));
  const suma = (lista: readonly Movimiento[], tipo: TipoDeMovimiento) => lista.filter((m) => m.tipo === tipo).reduce((n, m) => n + m.monto, 0);
  const ingresos = suma(delMes, "ingreso");
  const egresos = suma(delMes, "egreso");
  return {
    periodo,
    ingresos,
    egresos,
    resultado: ingresos - egresos,
    fondos: fondos.map((fondo) => {
      const propios = delMes.filter((m) => m.fondoId === fondo.id);
      const i = suma(propios, "ingreso");
      const e = suma(propios, "egreso");
      return { fondo, ingresos: i, egresos: e, saldo: fondo.saldoInicial + i - e };
    }),
    movimientos: [...delMes].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id)),
  };
}

const TOPE = 999_999_999_999;

/** "1,234.50", "1234,5" o "S/ 80" → céntimos; null si no es un monto válido. */
export function leerMonto(texto: string): number | null {
  let t = texto.trim().replace(/^S\/\s*/i, "").replace(/\s/g, "");
  if (t === "") return null;
  if (t.includes(".") && t.includes(",")) t = t.replace(/,/g, "");
  else if (/^\d+,\d{1,2}$/.test(t)) t = t.replace(",", ".");
  else t = t.replace(/,(?=\d{3}(\D|$))/g, "");
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(t);
  if (!m) return null;
  const n = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return n > TOPE ? null : n;
}

/** "24/10/2026" o "2026-10-24" → ISO; null si no es una fecha. */
export function leerFecha(texto: string): string | null {
  const t = texto.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  const partes = iso ? [iso[1], iso[2], iso[3]] : local ? [local[3], local[2], local[1]] : null;
  if (!partes) return null;
  const [a, m, d] = partes.map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return null;
  return f.toISOString().slice(0, 10);
}

export interface DatosDelEgreso {
  concepto: string;
  monto: string;
  fondoId: string | undefined;
  fecha: string;
  proveedor: string;
}

export type ErroresDelEgreso = Partial<Record<"concepto" | "monto" | "fondoId" | "fecha", string>>;

export interface EgresoNuevo {
  concepto: string;
  monto: number;
  fondoId: string;
  fecha: string;
  proveedor: string | null;
}

export type ValidacionDelEgreso = { ok: true; egreso: EgresoNuevo } | { ok: false; errores: ErroresDelEgreso };

export const CONCEPTO_MAXIMO = 120;

export function validarEgreso(d: DatosDelEgreso, ctx: { hoy: string; fondos: readonly FondoDelMes[] }): ValidacionDelEgreso {
  const e: ErroresDelEgreso = {};
  const concepto = d.concepto.trim();
  if (concepto === "") e.concepto = "Escribe en qué se gastó.";
  else if (concepto.length > CONCEPTO_MAXIMO) e.concepto = `Usa ${CONCEPTO_MAXIMO} caracteres o menos.`;

  const monto = leerMonto(d.monto);
  if (d.monto.trim() === "") e.monto = "Escribe el monto.";
  else if (monto === null) e.monto = "Escribe un monto válido, como 350,50.";
  else if (monto <= 0) e.monto = "El monto tiene que ser mayor que cero.";

  const fondo = ctx.fondos.find((f) => f.fondo.id === d.fondoId);
  if (!d.fondoId) e.fondoId = "Elige de qué fondo sale.";
  else if (!fondo) e.fondoId = "Ese fondo ya no existe.";
  else if (monto !== null && monto > fondo.saldo) e.fondoId = `El fondo no alcanza: le quedan ${(fondo.saldo / 100).toFixed(2)} soles.`;

  const fecha = leerFecha(d.fecha);
  if (d.fecha.trim() === "") e.fecha = "Escribe la fecha.";
  else if (fecha === null) e.fecha = "Escribe la fecha como 24/10/2026.";
  else if (fecha > ctx.hoy) e.fecha = "La fecha no puede ser posterior a hoy.";
  else if (fecha.slice(0, 7) !== ctx.hoy.slice(0, 7)) e.fecha = "Solo se registran egresos del mes en curso.";

  if (Object.keys(e).length > 0 || monto === null || !fondo || !fecha) return { ok: false, errores: e };
  return { ok: true, egreso: { concepto, monto, fondoId: fondo.fondo.id, fecha, proveedor: d.proveedor.trim() || null } };
}
