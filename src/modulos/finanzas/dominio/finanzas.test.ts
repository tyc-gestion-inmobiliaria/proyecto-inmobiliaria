import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { leerFecha, leerMonto, resumenDelMes, validarEgreso, type Fondo, type Movimiento } from "./finanzas";

const FONDOS: Fondo[] = [
  { id: "op", edificioId: "e", nombre: "Operación", saldoInicial: 100000 },
  { id: "res", edificioId: "e", nombre: "Reserva", saldoInicial: 500000 },
];

function mov(id: string, tipo: Movimiento["tipo"], monto: number, extra: Partial<Movimiento> = {}): Movimiento {
  return { id, edificioId: "e", fondoId: "op", tipo, fecha: "2026-10-10", concepto: "x", monto, proveedor: null, ...extra };
}

describe("finanzas del mes", () => {
  it("suma ingresos y egresos del mes y el saldo de cada fondo", () => {
    const r = resumenDelMes("2026-10", FONDOS, [
      mov("1", "ingreso", 50000),
      mov("2", "egreso", 30000),
      mov("3", "ingreso", 20000, { fondoId: "res" }),
      mov("viejo", "egreso", 99999, { fecha: "2026-09-30" }),
    ]);
    assert.equal(r.ingresos, 70000);
    assert.equal(r.egresos, 30000);
    assert.equal(r.resultado, 40000);
    assert.deepEqual(
      r.fondos.map((f) => [f.fondo.id, f.saldo]),
      [
        ["op", 120000],
        ["res", 520000],
      ],
    );
    assert.equal(r.movimientos.length, 3);
  });

  it("lee montos y fechas escritos", () => {
    assert.equal(leerMonto("1,234.50"), 123450);
    assert.equal(leerMonto("80,5"), 8050);
    assert.equal(leerMonto("abc"), null);
    assert.equal(leerFecha("24/10/2026"), "2026-10-24");
    assert.equal(leerFecha("31/02/2026"), null);
  });

  it("no deja un fondo en negativo", () => {
    const fondos = resumenDelMes("2026-10", FONDOS, []).fondos;
    const r = validarEgreso({ concepto: "Bomba", monto: "1500", fondoId: "op", fecha: "24/10/2026", proveedor: "" }, { hoy: "2026-10-24", fondos });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.errores.fondoId ?? "", /no alcanza/);
  });

  it("pide fecha del mes en curso y no futura", () => {
    const fondos = resumenDelMes("2026-10", FONDOS, []).fondos;
    const futura = validarEgreso({ concepto: "x", monto: "10", fondoId: "op", fecha: "25/10/2026", proveedor: "" }, { hoy: "2026-10-24", fondos });
    assert.equal(!futura.ok && futura.errores.fecha, "La fecha no puede ser posterior a hoy.");
    const pasada = validarEgreso({ concepto: "x", monto: "10", fondoId: "op", fecha: "30/09/2026", proveedor: "" }, { hoy: "2026-10-24", fondos });
    assert.equal(!pasada.ok && pasada.errores.fecha, "Solo se registran egresos del mes en curso.");
  });

  it("devuelve el egreso limpio", () => {
    const fondos = resumenDelMes("2026-10", FONDOS, []).fondos;
    const r = validarEgreso({ concepto: " Focos LED ", monto: "120,50", fondoId: "op", fecha: "2026-10-20", proveedor: " " }, { hoy: "2026-10-24", fondos });
    assert.deepEqual(r, { ok: true, egreso: { concepto: "Focos LED", monto: 12050, fondoId: "op", fecha: "2026-10-20", proveedor: null } });
  });
});
