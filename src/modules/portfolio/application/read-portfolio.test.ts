import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EdificiosFalso } from "@/modules/registry/infrastructure/buildings-fake";

import type { EstadoDelPadron } from "../domain/portfolio";
import { leerCartera } from "./read-portfolio";
import type { EstadoDeLaCarteraPuerto } from "./ports";

const completo: EstadoDelPadron = { unidades: 2, sinParticipacion: 0, total: 100, sumaCien: true };

function estado(padron: Map<string, EstadoDelPadron>, conCuenta: Set<string>, falla = false): EstadoDeLaCarteraPuerto {
  return {
    padronPorEdificio: async () => {
      if (falla) throw new Error("sin conexión");
      return padron;
    },
    edificiosConCuenta: async () => conCuenta,
    cierresDelPeriodo: async () => new Map([["e1", { estado: "borrador", paso: 3 }]]),
  };
}

describe("leerCartera", () => {
  it("con el padrón completo, dice el paso del cierre del mes", async () => {
    const filas = await leerCartera(edificios, estado(new Map([["e1", completo], ["e2", completo]]), new Set(["e1", "e2"])), "a");
    const porId = new Map(filas.map((f) => [f.id, f.cierre]));
    assert.deepEqual(porId.get("e1"), { texto: "Emitir recibos", paso: 3 });
    assert.deepEqual(porId.get("e2"), { texto: "Cargar lecturas", paso: 1 });
  });

  const edificios = new EdificiosFalso([
    { id: "e1", orgId: "a", nombre: "Torre 10", direccion: null },
    { id: "e2", orgId: "a", nombre: "Torre 2", direccion: null },
    { id: "e3", orgId: "b", nombre: "De otra administradora", direccion: null },
  ]);

  it("trae solo los edificios de la administradora, por nombre, con su estado", async () => {
    const filas = await leerCartera(edificios, estado(new Map([["e1", completo]]), new Set(["e1"])), "a");
    assert.deepEqual(
      filas.map((f) => f.nombre),
      ["Torre 2", "Torre 10"],
    );
    assert.deepEqual(filas[1].pendientes, []);
    assert.equal(filas[0].pendientes.length, 2);
  });

  it("si no se pudo leer el estado, rechaza en vez de inventar pendientes", async () => {
    await assert.rejects(leerCartera(edificios, estado(new Map(), new Set(), true), "a"));
  });
});
