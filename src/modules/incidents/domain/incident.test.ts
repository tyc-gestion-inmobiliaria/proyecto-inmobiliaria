import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  accionesDeLaIncidencia,
  contarPorEstado,
  estadoTrasLaAccion,
  ordenarIncidencias,
  puedeCambiar,
  validarIncidencia,
  type Incidencia,
} from "./incident";

function inc(id: string, extra: Partial<Incidencia> = {}): Incidencia {
  return {
    id,
    edificioId: "e",
    unidadId: null,
    unidadNumero: null,
    titulo: "x",
    detalle: null,
    prioridad: "media",
    estado: "abierta",
    reportadaEl: "2026-10-10",
    actualizadaEl: "2026-10-10",
    ...extra,
  };
}

describe("incidencias", () => {
  it("ofrece las acciones de cada estado", () => {
    assert.deepEqual(accionesDeLaIncidencia("abierta"), ["empezar", "resolver"]);
    assert.deepEqual(accionesDeLaIncidencia("en_curso"), ["resolver"]);
    assert.deepEqual(accionesDeLaIncidencia("resuelta"), ["reabrir"]);
    assert.equal(estadoTrasLaAccion("empezar"), "en_curso");
  });

  it("no salta de resuelta a en curso", () => {
    assert.equal(puedeCambiar("resuelta", "en_curso"), false);
    assert.equal(puedeCambiar("resuelta", "abierta"), true);
    assert.equal(puedeCambiar("abierta", "resuelta"), true);
  });

  it("ordena por prioridad y luego por antigüedad", () => {
    const r = ordenarIncidencias([
      inc("baja", { prioridad: "baja", reportadaEl: "2026-10-01" }),
      inc("alta-nueva", { prioridad: "alta", reportadaEl: "2026-10-12" }),
      inc("alta-vieja", { prioridad: "alta", reportadaEl: "2026-10-02" }),
    ]);
    assert.deepEqual(
      r.map((x) => x.id),
      ["alta-vieja", "alta-nueva", "baja"],
    );
  });

  it("cuenta por estado", () => {
    assert.deepEqual(contarPorEstado([inc("a"), inc("b", { estado: "resuelta" })]), { abierta: 1, en_curso: 0, resuelta: 1 });
  });

  it("valida título, lugar y prioridad junto al campo", () => {
    assert.deepEqual(Object.keys(validarIncidencia({ titulo: " ", unidadId: undefined, prioridad: undefined, detalle: "" })).sort(), [
      "prioridad",
      "titulo",
      "unidadId",
    ]);
    assert.deepEqual(validarIncidencia({ titulo: "Fuga", unidadId: "", prioridad: "alta", detalle: "" }), {});
  });
});
