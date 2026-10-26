import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { csvDelReporte, deudaVencida, generar, morosidad, porValidar, recaudacion, type Datos } from "./reports";

const DATOS: Datos = {
  edificios: [
    { id: "a", nombre: "Edificio A" },
    { id: "b", nombre: "Edificio B" },
  ],
  unidades: [
    { id: "a1", edificioId: "a", numero: "101", deudaAnterior: 0 },
    { id: "a2", edificioId: "a", numero: "102", deudaAnterior: 5000 },
    { id: "b1", edificioId: "b", numero: "101", deudaAnterior: 0 },
  ],
  recibos: [
    { edificioId: "a", unidadId: "a1", periodo: "2026-10-01", total: 30000, vence: "2026-10-28" },
    { edificioId: "a", unidadId: "a2", periodo: "2026-10-01", total: 30000, vence: "2026-10-28" },
    { edificioId: "b", unidadId: "b1", periodo: "2026-09-01", total: 20000, vence: "2026-09-28" },
  ],
  pagos: [
    { edificioId: "a", unidadId: "a1", monto: 30000, fecha: "2026-10-05", estado: "aceptado" },
    { edificioId: "a", unidadId: "a2", monto: 10000, fecha: "2026-10-06", estado: "aceptado" },
    { edificioId: "a", unidadId: "a2", monto: 20000, fecha: "2026-10-07", estado: "por_validar" },
    { edificioId: "b", unidadId: "b1", monto: 5000, fecha: "2026-10-02", estado: "rechazado" },
  ],
};

describe("reportes", () => {
  it("recaudación del mes por edificio, con el total", () => {
    const r = recaudacion(DATOS, "2026-10", null);
    assert.deepEqual(r.filas[0], { edificio: "Edificio A", recibos: 2, pagados: 1, emitido: 60000, cobrado: 40000, avance: 40000 / 60000 });
    assert.deepEqual(r.filas[1], { edificio: "Edificio B", recibos: 0, pagados: 0, emitido: 0, cobrado: 0, avance: null });
    assert.equal(r.total?.cobrado, 40000);
  });

  it("recaudación de un edificio, por unidad", () => {
    const r = recaudacion(DATOS, "2026-10", "a");
    assert.deepEqual(
      r.filas.map((f) => [f.unidad, f.saldo]),
      [
        ["101", 0],
        ["102", 20000],
      ],
    );
  });

  it("la deuda vencida suma lo arrastrado y lo vencido sin pagar", () => {
    assert.equal(deudaVencida(DATOS, DATOS.unidades[1], "2026-10-24"), 5000);
    assert.equal(deudaVencida(DATOS, DATOS.unidades[2], "2026-10-24"), 20000);
    assert.equal(deudaVencida(DATOS, DATOS.unidades[0], "2026-10-29"), 0);
  });

  it("morosidad por edificio y por unidad", () => {
    const r = morosidad(DATOS, "2026-10-24", null);
    assert.deepEqual(r.filas[0], { edificio: "Edificio A", unidades: 2, conDeuda: 1, proporcion: 0.5, deuda: 5000 });
    assert.equal(r.total?.deuda, 25000);
    assert.deepEqual(morosidad(DATOS, "2026-10-24", "a").filas, [{ unidad: "102", deuda: 5000 }]);
  });

  it("pagos por validar con el más antiguo", () => {
    const r = porValidar(DATOS, null);
    assert.deepEqual(r.filas[0], { edificio: "Edificio A", pagos: 1, monto: 20000, desde: "2026-10-07" });
    assert.equal(generar("por-validar", DATOS, { hoy: "2026-10-24", edificioId: "b" }).filas.length, 0);
  });
});

describe("csvDelReporte", () => {
  it("pone los títulos, los montos en soles sin símbolo y el total al final", () => {
    const csv = csvDelReporte({
      columnas: [
        { clave: "unidad", titulo: "Unidad", tipo: "texto" },
        { clave: "monto", titulo: "Por cobrar", tipo: "soles" },
      ],
      filas: [
        { unidad: "101", monto: 33980 },
        { unidad: "Local \"A\", piso 1", monto: null },
      ],
      total: { unidad: "Total", monto: 33980 },
    });
    assert.equal(csv, 'Unidad,Por cobrar\n101,339.80\n"Local ""A"", piso 1",\nTotal,339.80');
  });
});
