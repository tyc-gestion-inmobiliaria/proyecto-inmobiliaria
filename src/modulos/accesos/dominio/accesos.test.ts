import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  debeAvisarse,
  diaDeLima,
  diasEnPorteria,
  entregadosHoy,
  paquetesPendientes,
  validarEntrega,
  validarPaquete,
  validarVisita,
  visitasDeHoy,
  type Paquete,
  type Visita,
} from "./accesos";

function paq(id: string, extra: Partial<Paquete> = {}): Paquete {
  return {
    id,
    edificioId: "e",
    unidadId: "u",
    unidadNumero: "101",
    remitente: "Reparto",
    descripcion: null,
    recibidoEn: "2026-10-24T09:00:00-05:00",
    entregadoEn: null,
    entregadoA: null,
    ...extra,
  };
}

function vis(id: string, extra: Partial<Visita> = {}): Visita {
  return { id, edificioId: "e", unidadId: "u", unidadNumero: "101", visitante: "X", documento: null, entrada: "2026-10-24T10:00:00-05:00", salida: null, ...extra };
}

describe("accesos y paquetes", () => {
  it("toma el día de Lima, no el de UTC", () => {
    assert.equal(diaDeLima("2026-10-24T22:00:00-05:00"), "2026-10-24");
  });

  it("cuenta los días en portería y avisa pasado el límite", () => {
    const viejo = paq("v", { recibidoEn: "2026-10-19T09:00:00-05:00" });
    assert.equal(diasEnPorteria(viejo, "2026-10-24"), 5);
    assert.equal(debeAvisarse(viejo, "2026-10-24"), true);
    assert.equal(debeAvisarse(paq("n"), "2026-10-24"), false);
  });

  it("lista los pendientes, el más antiguo primero, y los entregados hoy", () => {
    const lista = [
      paq("b", { recibidoEn: "2026-10-23T09:00:00-05:00" }),
      paq("a", { recibidoEn: "2026-10-20T09:00:00-05:00" }),
      paq("e", { entregadoEn: "2026-10-24T11:00:00-05:00", entregadoA: "Y" }),
      paq("ayer", { entregadoEn: "2026-10-23T11:00:00-05:00", entregadoA: "Y" }),
    ];
    assert.deepEqual(paquetesPendientes(lista).map((p) => p.id), ["a", "b"]);
    assert.deepEqual(entregadosHoy(lista, "2026-10-24").map((p) => p.id), ["e"]);
  });

  it("pone primero las visitas que siguen adentro", () => {
    const r = visitasDeHoy(
      [
        vis("salio", { entrada: "2026-10-24T12:00:00-05:00", salida: "2026-10-24T13:00:00-05:00" }),
        vis("adentro", { entrada: "2026-10-24T09:00:00-05:00" }),
        vis("ayer", { entrada: "2026-10-23T09:00:00-05:00", salida: "2026-10-23T10:00:00-05:00" }),
      ],
      "2026-10-24",
    );
    assert.deepEqual(r.map((v) => v.id), ["adentro", "salio"]);
  });

  it("valida junto al campo", () => {
    assert.equal(validarEntrega("  "), "Escribe quién lo recoge.");
    assert.equal(validarEntrega("Ana"), undefined);
    assert.deepEqual(validarPaquete({ unidadId: undefined, remitente: "" }), { unidadId: "Elige la unidad.", remitente: "Escribe quién lo trae." });
    assert.deepEqual(validarVisita({ unidadId: "u", visitante: "Luis" }), {});
  });
});
