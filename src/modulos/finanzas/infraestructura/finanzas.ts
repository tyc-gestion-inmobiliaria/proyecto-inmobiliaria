/**
 * Las finanzas como las piden las rutas. Solo existe la maqueta: fondos y
 * movimientos ficticios en memoria, más los pagos aceptados de la semilla
 * como ingresos. La versión con Supabase falta: no hay tablas todavía; ahí
 * el resumen lo calcularía una función de Postgres.
 */
import { hoyEnLima } from "@/compartido/formato";
import { numeroDeUnidad } from "@/compartido/maqueta/consultas";
import { demora } from "@/compartido/maqueta/modo";
import { mundo, nuevoId } from "@/compartido/maqueta/mundo";

import type { FinanzasPuerto } from "../aplicacion/puertos";
import { resumenDelMes, validarEgreso, type Fondo, type Movimiento } from "../dominio/finanzas";

const fondos: Fondo[] = mundo.edificios.flatMap((e, i) => [
  { id: `${e.id}-operacion`, edificioId: e.id, nombre: "Fondo de operación", saldoInicial: [412050, 285000, 98000][i] ?? 100000 },
  { id: `${e.id}-reserva`, edificioId: e.id, nombre: "Fondo de reserva", saldoInicial: [1850000, 1240000, 610000][i] ?? 500000 },
]);

/** Un día del mes en curso que no pase de hoy. */
function diaDelMes(dia: number): string {
  const hoy = hoyEnLima();
  const pedido = `${hoy.slice(0, 7)}-${String(dia).padStart(2, "0")}`;
  return pedido > hoy ? hoy : pedido;
}

const movimientos: Movimiento[] = [];
for (const e of mundo.edificios) {
  const mov = (tipo: Movimiento["tipo"], dia: number, concepto: string, soles: number, fondo = "operacion", proveedor: string | null = null) =>
    movimientos.push({ id: `mov-${movimientos.length + 1}`, edificioId: e.id, fondoId: `${e.id}-${fondo}`, tipo, fecha: diaDelMes(dia), concepto, monto: Math.round(soles * 100), proveedor });
  mov("egreso", 3, "Limpieza y conserjería", 2400, "operacion", "Servicios de Limpieza Demo");
  mov("egreso", 5, "Mantenimiento de ascensor", 650, "operacion", "Elevadores Demo");
  mov("egreso", 8, "Luz de áreas comunes", 380);
  mov("egreso", 12, "Focos LED para pasadizos", 145.5, "operacion", "Ferretería Demo");
  mov("ingreso", 6, "Aporte del mes al fondo de reserva", 300, "reserva");
  mov("ingreso", 9, "Alquiler del salón de usos múltiples", 150);
  if (e.id === "ed-acacias") mov("egreso", 10, "Cambio de la bomba de agua", 3200, "reserva", "Hidráulica Demo");
}

/** Los pagos aceptados de la semilla son los ingresos de cuotas: los escribe `pagos`, aquí solo se leen. */
function ingresosDeCuotas(edificioId: string): Movimiento[] {
  const mes = hoyEnLima().slice(0, 7);
  return mundo.pagos
    .filter((p) => p.edificioId === edificioId && p.estado === "aceptado" && p.fecha.startsWith(mes))
    .map((p) => ({
      id: `cuota-${p.id}`,
      edificioId,
      fondoId: `${edificioId}-operacion`,
      tipo: "ingreso" as const,
      fecha: p.fecha,
      concepto: `Cuota cobrada · unidad ${numeroDeUnidad(p.unidadId)}`,
      monto: Math.round(p.monto * 100),
      proveedor: null,
    }));
}

function calcular(edificioId: string) {
  const propios = [...movimientos.filter((m) => m.edificioId === edificioId), ...ingresosDeCuotas(edificioId)];
  return resumenDelMes(hoyEnLima().slice(0, 7), fondos.filter((f) => f.edificioId === edificioId), propios);
}

export const finanzasMaqueta: FinanzasPuerto = {
  resumen(edificioId) {
    return demora(calcular(edificioId));
  },

  registrarEgreso(edificioId, egreso) {
    // Lo que haría la función de la base: vuelve a validar contra el saldo de ahora.
    const r = validarEgreso(
      { concepto: egreso.concepto, monto: (egreso.monto / 100).toFixed(2), fondoId: egreso.fondoId, fecha: egreso.fecha, proveedor: egreso.proveedor ?? "" },
      { hoy: hoyEnLima(), fondos: calcular(edificioId).fondos },
    );
    if (!r.ok) return demora({ ok: false as const, mensaje: Object.values(r.errores)[0] ?? "No se pudo registrar." });
    const m: Movimiento = { id: nuevoId("mov"), edificioId, tipo: "egreso", ...r.egreso };
    movimientos.push(m);
    return demora({ ok: true as const, valor: { ...m } });
  },
};

export const finanzasAdaptador: FinanzasPuerto = finanzasMaqueta;
