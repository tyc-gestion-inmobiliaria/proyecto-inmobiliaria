import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { initials } from "./avatar-logic";
import { addMonths, daysOfMonth, isInside, isoDate, orderRange, parseYearMonth, todayIso } from "./calendar-logic";
import { barWidth, fitFontSize } from "./number-logic";
import { filterOptions, isFiltering, moveActive, normalize, type SelectOption } from "./select-logic";

const opciones: SelectOption[] = [
  { id: "a", label: "Ana Núñez" },
  { id: "b", label: "Martín Pérez", detail: "Sede norte" },
  { id: "c", label: "Lucía", disabled: true, detail: "De vacaciones" },
  { id: "d", label: "Óscar" },
];

describe("Select: búsqueda", () => {
  it("ignora tildes y mayúsculas", () => {
    assert.equal(normalize("  MARTÍN "), "martin");
    assert.deepEqual(filterOptions(opciones, "nunez").map((o) => o.id), ["a"]);
    assert.deepEqual(filterOptions(opciones, "oscar").map((o) => o.id), ["d"]);
  });
  it("busca también en el detalle", () => {
    assert.deepEqual(filterOptions(opciones, "norte").map((o) => o.id), ["b"]);
  });
  it("sin consulta devuelve todo", () => {
    assert.equal(filterOptions(opciones, "  ").length, 4);
  });
});

describe("Select: flechas", () => {
  it("baja saltando las apagadas", () => {
    assert.equal(moveActive(opciones, 1, 1), 3);
  });
  it("da la vuelta en los extremos", () => {
    assert.equal(moveActive(opciones, 3, 1), 0);
    assert.equal(moveActive(opciones, 0, -1), 3);
  });
  it("sin elegibles se queda donde está", () => {
    assert.equal(moveActive([{ id: "x", label: "x", disabled: true }], 0, 1), 0);
  });
});

describe("Select: neutro", () => {
  it("marca el recorte solo si hay neutro y la elegida es otra", () => {
    assert.equal(isFiltering("norte", "todas"), true);
    assert.equal(isFiltering("todas", "todas"), false);
    assert.equal(isFiltering(undefined, "todas"), false);
    assert.equal(isFiltering("norte", undefined), false);
  });
});

describe("Calendar", () => {
  it("coloca el 1 bajo su día de la semana (lunes primero)", () => {
    // El 1 de octubre de 2026 cae jueves: tres huecos antes.
    const dias = daysOfMonth(2026, 9);
    assert.deepEqual(dias.slice(0, 4), [null, null, null, 1]);
    assert.equal(dias.filter((d) => d !== null).length, 31);
  });
  it("con domingo primero, cuatro huecos", () => {
    assert.deepEqual(daysOfMonth(2026, 9, 0).slice(0, 5), [null, null, null, null, 1]);
  });
  it("febrero bisiesto tiene 29", () => {
    assert.equal(daysOfMonth(2028, 1).filter((d) => d !== null).length, 29);
  });
  it("suma y resta meses cruzando el año", () => {
    assert.deepEqual(addMonths({ year: 2026, month: 11 }, 1), { year: 2027, month: 0 });
    assert.deepEqual(addMonths({ year: 2026, month: 0 }, -1), { year: 2025, month: 11 });
  });
  it("ordena un rango tocado al revés", () => {
    assert.deepEqual(orderRange("2026-10-05", "2026-10-01"), { from: "2026-10-01", to: "2026-10-05" });
  });
  it("respeta min y max", () => {
    assert.equal(isInside("2026-10-05", "2026-10-01", "2026-10-31"), true);
    assert.equal(isInside("2026-09-30", "2026-10-01"), false);
    assert.equal(isInside("2026-11-01", undefined, "2026-10-31"), false);
  });
  it("formatea y lee fechas", () => {
    assert.equal(isoDate(2026, 0, 5), "2026-01-05");
    assert.deepEqual(parseYearMonth("2026-03-14"), { year: 2026, month: 2 });
    assert.equal(todayIso(new Date(2026, 9, 11)), "2026-10-11");
  });
});

describe("CellWithBar", () => {
  it("un valor chico pero real no desaparece", () => {
    assert.equal(barWidth(0.001), 2);
  });
  it("cero, negativo o NaN no pinta barra", () => {
    assert.equal(barWidth(0), 0);
    assert.equal(barWidth(-1), 0);
    assert.equal(barWidth(Number.NaN), 0);
  });
  it("no pasa del 100 %", () => {
    assert.equal(barWidth(1.5), 100);
  });
});

describe("FitNumber", () => {
  it("sin medida usa el tamaño pedido", () => {
    assert.equal(fitFontSize("S/ 1,000.00", 0, 28, 14), 28);
  });
  it("baja hasta que entra", () => {
    // 12 caracteres × 0.6 = 7.2 emes; en 144 px entran a 20.
    assert.equal(fitFontSize("S/ 45,990.00", 144, 28, 14), 20);
  });
  it("no baja del mínimo ni sube del techo", () => {
    assert.equal(fitFontSize("S/ 45,990,000.00", 50, 28, 14), 14);
    assert.equal(fitFontSize("9", 1000, 28, 14), 28);
  });
});

describe("Avatar: iniciales", () => {
  it("primera del primer nombre y del último", () => {
    assert.equal(initials("martín pérez rojas"), "MR");
  });
  it("con un solo nombre, sus dos primeras", () => {
    assert.equal(initials("Lucía"), "LU");
  });
  it("sin nombre, un signo en vez del círculo vacío", () => {
    assert.equal(initials("   "), "?");
  });
});
