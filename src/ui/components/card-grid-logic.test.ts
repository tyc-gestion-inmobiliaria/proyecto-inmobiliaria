import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { columnasDeRejilla } from "./card-grid-logic";

describe("columnasDeRejilla", () => {
  it("entra una sola columna si no alcanza para dos", () => {
    assert.deepEqual(columnasDeRejilla(400, 480, 8), { columnas: 1, anchoDeCelda: 400 });
  });

  it("reparte el ancho entre las columnas que entran, descontando la separación", () => {
    assert.deepEqual(columnasDeRejilla(1000, 480, 8), { columnas: 2, anchoDeCelda: 496 });
    assert.deepEqual(columnasDeRejilla(1272, 280, 12), { columnas: 4, anchoDeCelda: 309 });
  });

  it("respeta el máximo de columnas", () => {
    assert.equal(columnasDeRejilla(2000, 300, 12, 3).columnas, 3);
  });

  it("sin ancho medido todavía, una columna", () => {
    assert.deepEqual(columnasDeRejilla(0, 300, 12), { columnas: 1, anchoDeCelda: 0 });
  });
});
