import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { estadosDeLosPasos, queFaltaParaContinuar, type AvanceDelCierre } from "./cierre";
import { leerMonto, sumar, textoDeSoles } from "./dinero";
import { avanceDeLecturas, avisoDeLectura, consumo, leerMedida, rutaDeFoto } from "./lectura";
import { leerFecha, periodoDe, sumarMeses, textoDePeriodo, vencimientoSugerido } from "./periodo";
import { leerPartidas, totalDeFilas } from "./presupuesto";
import { repartir } from "./prorrateo";
import { cargosDeLaUnidad, estadoDeLaUnidad, htmlDelRecibo, resumenDePrevia, saldoDeLaUnidad, type FilaPrevia, type Recibo } from "./recibo";
import { bloqueantes, motivoParaNoEmitir, validacionesDelCierre, type EstadoDelPadron } from "./validaciones";

describe("repartir", () => {
  it("reparte por participación y la suma es exactamente el total", () => {
    const r = repartir(1000.01, [
      { clave: "101", peso: 50 },
      { clave: "102", peso: 30 },
      { clave: "103", peso: 20 },
    ]);
    assert.equal(r.get("101"), 500.01);
    assert.equal(r.get("102"), 300);
    assert.equal(r.get("103"), 200);
  });

  it("a igual resto, el céntimo va por orden", () => {
    const r = repartir(100, [
      { clave: "a", peso: 1 },
      { clave: "b", peso: 1 },
      { clave: "c", peso: 1 },
    ]);
    assert.deepEqual([...r.values()], [33.34, 33.33, 33.33]);
  });

  it("una participación cero no paga", () => {
    const r = repartir(500, [
      { clave: "a", peso: 100 },
      { clave: "b", peso: 0 },
    ]);
    assert.equal(r.get("b"), 0);
    assert.equal(r.get("a"), 500);
  });

  it("sin pesos o sin total, todo en cero", () => {
    assert.deepEqual([...repartir(100, [{ clave: "a", peso: 0 }]).values()], [0]);
    assert.deepEqual([...repartir(0, [{ clave: "a", peso: 10 }]).values()], [0]);
  });

  it("cuadra al céntimo en mil casos al azar", () => {
    let semilla = 7;
    const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
    for (let caso = 0; caso < 1000; caso++) {
      const total = Math.round(azar() * 10_000_000) / 100;
      const pesos = Array.from({ length: 1 + Math.floor(azar() * 40) }, (_, i) => ({ clave: String(i), peso: Math.round(azar() * 10_000) / 100 }));
      if (pesos.every((p) => p.peso === 0)) continue;
      const partes = [...repartir(total, pesos).values()];
      assert.equal(sumar(partes), total, `caso ${caso}`);
      assert.ok(partes.every((p) => p >= 0 && Math.abs(Math.round(p * 100) - p * 100) < 1e-6));
    }
  });
});

describe("lecturas", () => {
  it("calcula el consumo y no lo da si la lectura retrocede o falta", () => {
    assert.equal(consumo(10, 22.5), 12.5);
    assert.equal(consumo(10, 9), null);
    assert.equal(consumo(null, 9), null);
    assert.equal(consumo(10, null), null);
  });

  it("el aviso va en la fila con su causa", () => {
    assert.equal(avisoDeLectura(10, null)?.tipo, "vacia");
    assert.equal(avisoDeLectura(10, 5)?.tipo, "menor");
    assert.ok(avisoDeLectura(10, 5)?.bloquea);
    assert.equal(avisoDeLectura(null, 5)?.tipo, "sin-anterior");
    assert.equal(avisoDeLectura(10, "invalida")?.tipo, "invalida");
    assert.equal(avisoDeLectura(10, 12), null);
  });

  it("lee la medida con coma o punto y rechaza letras", () => {
    assert.equal(leerMedida("12,5"), 12.5);
    assert.equal(leerMedida(""), null);
    assert.equal(leerMedida("12a"), "invalida");
    assert.equal(leerMedida("1.2345"), "invalida");
  });

  it("cuenta el avance y arma la ruta de la foto por administradora", () => {
    assert.equal(avanceDeLecturas([{ actual: 1 }, { actual: null }]).texto, "1 de 2 con lectura");
    assert.equal(rutaDeFoto("org", "c", "u", ".JPG"), "org/c/u.jpg");
  });
});

describe("dinero y periodo", () => {
  it("escribe y lee soles", () => {
    assert.equal(textoDeSoles(1234.5), "S/ 1,234.50");
    assert.equal(leerMonto("1,234.50"), 1234.5);
    assert.equal(leerMonto("1234,5"), 1234.5);
    assert.equal(leerMonto("S/ 80"), 80);
    assert.equal(leerMonto("12.345"), null);
    assert.equal(leerMonto("abc"), null);
  });

  it("maneja los periodos y el vencimiento sugerido", () => {
    assert.equal(periodoDe("2026-09-17"), "2026-09-01");
    assert.equal(sumarMeses("2026-12-01", 1), "2027-01-01");
    assert.equal(sumarMeses("2026-01-01", -1), "2025-12-01");
    assert.equal(textoDePeriodo("2026-09-01"), "septiembre de 2026");
    assert.equal(vencimientoSugerido("2026-12-01"), "2027-01-15");
    assert.equal(leerFecha("15/10/2026"), "2026-10-15");
    assert.equal(leerFecha("31/02/2026"), null);
  });
});

describe("presupuesto", () => {
  it("lee las partidas, ignora las filas vacías y marca los errores por fila", () => {
    const ok = leerPartidas([
      { clave: "1", concepto: " Limpieza ", monto: "600.01" },
      { clave: "2", concepto: "", monto: "" },
    ]);
    assert.ok(ok.ok && ok.partidas.length === 1 && ok.partidas[0].concepto === "Limpieza");
    const mal = leerPartidas([{ clave: "1", concepto: "", monto: "-3" }]);
    assert.ok(!mal.ok && mal.errores["1"].concepto && mal.errores["1"].monto);
    assert.equal(totalDeFilas([{ monto: "0.1" }, { monto: "0.2" }, { monto: "x" }]), 0.3);
  });
});

const padronBien: EstadoDelPadron = { unidades: 3, sinParticipacion: 0, total: 100, sumaCien: true, cuentas: 1 };

describe("validaciones del cierre", () => {
  it("con todo en orden no bloquea nada", () => {
    const v = validacionesDelCierre(padronBien, { sinLectura: 0, atipicos: 0 });
    assert.equal(bloqueantes(v).length, 0);
    assert.equal(motivoParaNoEmitir(v), null);
  });

  it("bloquean la participación y la cuenta; avisan las lecturas", () => {
    const v = validacionesDelCierre({ ...padronBien, total: 92.5, sumaCien: false, cuentas: 0 }, { sinLectura: 2, atipicos: 1 });
    assert.deepEqual(
      bloqueantes(v).map((x) => x.clave),
      ["participacion", "cuenta"],
    );
    assert.match(v[0].causa, /faltan 7.5 %/);
    assert.equal(v[2].estado, "aviso");
    assert.match(motivoParaNoEmitir(v) ?? "", /^No se puede emitir/);
  });
});

const avance: AvanceDelCierre = { lecturasConError: 0, montoAguaEscrito: true, partidas: 2, bloqueantes: 0 };

describe("pasos del cierre", () => {
  it("Continuar dice qué falta", () => {
    assert.match(queFaltaParaContinuar(1, { ...avance, lecturasConError: 2 }) ?? "", /2 lecturas/);
    assert.match(queFaltaParaContinuar(1, { ...avance, montoAguaEscrito: false }) ?? "", /agua/);
    assert.match(queFaltaParaContinuar(2, { ...avance, partidas: 0 }) ?? "", /partida/);
    assert.match(queFaltaParaContinuar(3, { ...avance, bloqueantes: 1 }) ?? "", /bloquea/);
    assert.equal(queFaltaParaContinuar(2, avance), null);
  });

  it("marca hechos, el actual y el bloqueado", () => {
    assert.deepEqual(estadosDeLosPasos({ estado: "borrador", paso: 3 }, { ...avance, bloqueantes: 1 }), {
      1: "done",
      2: "done",
      3: "current",
      4: "blocked",
    });
    assert.deepEqual(Object.values(estadosDeLosPasos({ estado: "emitido", paso: 4 }, avance)), ["done", "done", "done", "done"]);
  });
});

const recibo = (r: Partial<Recibo>): Recibo => ({
  id: "r1",
  numero: 1,
  cierreId: "c1",
  edificioId: "e1",
  unidadId: "u1",
  unidadNumero: "101",
  periodo: "2026-09-01",
  participacion: 50,
  consumo: 10,
  cuota: 500.01,
  agua: 25,
  deudaPrevia: 0,
  total: 525.01,
  vence: "2026-10-15",
  emitidoEn: "2026-09-30T12:00:00Z",
  ...r,
});

describe("recibo y estado de cuenta", () => {
  it("resume la vista previa", () => {
    const fila: FilaPrevia = {
      unidadId: "u",
      unidadNumero: "101",
      participacion: 50,
      anterior: 1,
      actual: null,
      consumo: null,
      cuota: 0.1,
      agua: 0,
      deudaPrevia: 0.2,
      total: 0.3,
      sinLectura: true,
      atipico: false,
    };
    const r = resumenDePrevia([fila, { ...fila, sinLectura: false }]);
    assert.equal(r.total, 0.6);
    assert.equal(r.conAlerta, 1);
  });

  it("separa los cargos, suma el saldo y dice el estado en palabras", () => {
    const recibos = [recibo({}), recibo({ id: "r2", numero: 4, periodo: "2026-10-01", vence: "2026-11-15", agua: 0, cuota: 100 })];
    const cargos = cargosDeLaUnidad(recibos, "2026-10-20");
    assert.deepEqual(
      cargos.map((c) => `${c.concepto} ${c.periodo} ${c.estado}`),
      ["Mantenimiento 2026-10-01 por-vencer", "Mantenimiento 2026-09-01 vencido", "Agua 2026-09-01 vencido"],
    );
    assert.equal(saldoDeLaUnidad(recibos), 625.01);
    assert.equal(estadoDeLaUnidad(recibos, "2026-10-20").texto, "Con deuda vencida");
    assert.equal(estadoDeLaUnidad([recibo({})], "2026-10-01").texto, "Con deuda por vencer");
    assert.equal(estadoDeLaUnidad([], "2026-10-01").texto, "Sin recibos");
  });

  it("arma el recibo imprimible escapando el texto", () => {
    const html = htmlDelRecibo(recibo({ unidadNumero: "<b>1</b>" }), {
      edificio: "Edificio",
      direccion: null,
      administradora: "Administradora",
      cuentas: [{ banco: "Banco", numero: "000-1", cci: null, moneda: "PEN" }],
    });
    assert.match(html, /N\.º 000001/);
    assert.match(html, /&lt;b&gt;1&lt;\/b&gt;/);
    assert.match(html, /S\/ 525\.01/);
  });
});
