import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  armarCartera,
  formatoPorcentaje,
  indicadoresDeLaCartera,
  pendientesDelEdificio,
  type EstadoDelPadron,
} from "./cartera";

const completo: EstadoDelPadron = { unidades: 3, sinParticipacion: 0, total: 100, sumaCien: true };

describe("formatoPorcentaje", () => {
  it("usa coma decimal y quita los ceros de más", () => {
    assert.equal(formatoPorcentaje(100), "100 %");
    assert.equal(formatoPorcentaje(92.5), "92,5 %");
    assert.equal(formatoPorcentaje(33.3333), "33,3333 %");
  });
  it("no arrastra errores de coma flotante", () => {
    assert.equal(formatoPorcentaje(0.1 + 0.2), "0,3 %");
  });
});

describe("pendientesDelEdificio", () => {
  it("sin pendientes cuando tiene unidades, suma 100 y cuenta bancaria", () => {
    assert.deepEqual(pendientesDelEdificio(completo, true), []);
  });

  it("sin unidades pide registrarlas y no habla de participación", () => {
    const p = pendientesDelEdificio({ unidades: 0, sinParticipacion: 0, total: 0, sumaCien: false }, true);
    assert.deepEqual(
      p.map((x) => x.tipo),
      ["sin-unidades"],
    );
    assert.equal(p[0].paso, "Registrar unidades");
  });

  it("cuenta las unidades sin participación, en singular y plural", () => {
    const una = pendientesDelEdificio({ unidades: 3, sinParticipacion: 1, total: 60, sumaCien: false }, true);
    const dos = pendientesDelEdificio({ unidades: 3, sinParticipacion: 2, total: 30, sumaCien: false }, true);
    assert.equal(una[0].causa, "1 unidad sin participación");
    assert.equal(dos[0].causa, "2 unidades sin participación");
    assert.equal(dos[0].paso, "Completar participación");
  });

  it("si no llega a 100 dice cuánto suma y pide completarla", () => {
    const [p] = pendientesDelEdificio({ unidades: 2, sinParticipacion: 0, total: 92.5, sumaCien: false }, true);
    assert.equal(p.tipo, "participacion-incompleta");
    assert.equal(p.causa, "La participación suma 92,5 %");
    assert.equal(p.paso, "Completar participación");
  });

  it("si pasa de 100 pide corregirla", () => {
    const [p] = pendientesDelEdificio({ unidades: 2, sinParticipacion: 0, total: 110, sumaCien: false }, true);
    assert.equal(p.tipo, "participacion-excedida");
    assert.equal(p.paso, "Corregir participación");
  });

  it("sin cuenta bancaria va después de lo de las unidades", () => {
    const p = pendientesDelEdificio({ unidades: 0, sinParticipacion: 0, total: 0, sumaCien: false }, false);
    assert.deepEqual(
      p.map((x) => x.tipo),
      ["sin-unidades", "sin-cuenta"],
    );
    assert.equal(p[1].paso, "Registrar cuenta bancaria");
  });

  it("todo pendiente lleva causa y siguiente paso", () => {
    const todos = [
      ...pendientesDelEdificio({ unidades: 0, sinParticipacion: 0, total: 0, sumaCien: false }, false),
      ...pendientesDelEdificio({ unidades: 2, sinParticipacion: 1, total: 10, sumaCien: false }, false),
      ...pendientesDelEdificio({ unidades: 2, sinParticipacion: 0, total: 90, sumaCien: false }, true),
      ...pendientesDelEdificio({ unidades: 2, sinParticipacion: 0, total: 120, sumaCien: false }, true),
    ];
    for (const p of todos) {
      assert.ok(p.causa.length > 0);
      assert.ok(p.paso.length > 0);
    }
  });
});

describe("armarCartera", () => {
  const edificios = [
    { id: "e1", nombre: "Torre Sol" },
    { id: "e2", nombre: "Residencial Norte" },
  ];

  it("arma una fila por edificio, en el orden recibido, con su estado", () => {
    const filas = armarCartera(edificios, new Map([["e1", completo]]), new Set(["e1"]));
    assert.deepEqual(
      filas.map((f) => f.id),
      ["e1", "e2"],
    );
    assert.equal(filas[0].unidades, 3);
    assert.deepEqual(filas[0].participacion, { total: 100, sumaCien: true });
    assert.equal(filas[0].tieneCuenta, true);
    assert.deepEqual(filas[0].pendientes, []);
  });

  it("al edificio que no está en el padrón le cuenta cero unidades y sin participación", () => {
    const [, norte] = armarCartera(edificios, new Map([["e1", completo]]), new Set());
    assert.equal(norte.unidades, 0);
    assert.equal(norte.participacion, null);
    assert.deepEqual(
      norte.pendientes.map((p) => p.tipo),
      ["sin-unidades", "sin-cuenta"],
    );
  });

  it("sin edificios, sin filas", () => {
    assert.deepEqual(armarCartera([], new Map(), new Set()), []);
  });
});

describe("indicadoresDeLaCartera", () => {
  const edificios = [
    { id: "e1", nombre: "A" },
    { id: "e2", nombre: "B" },
  ];

  it("suma las unidades y cuenta los edificios con pendientes", () => {
    const filas = armarCartera(edificios, new Map([["e1", completo], ["e2", { ...completo, unidades: 4 }]]), new Set(["e1"]));
    assert.deepEqual(
      indicadoresDeLaCartera(filas).map((i) => [i.clave, i.valor]),
      [
        ["unidades", 7],
        ["por-completar", 1],
      ],
    );
  });

  it("no arma una tarjeta en cero", () => {
    const todoCompleto = armarCartera(edificios, new Map([["e1", completo], ["e2", completo]]), new Set(["e1", "e2"]));
    assert.deepEqual(
      indicadoresDeLaCartera(todoCompleto).map((i) => i.clave),
      ["unidades"],
    );
    const sinUnidades = armarCartera(edificios, new Map(), new Set(["e1", "e2"]));
    assert.deepEqual(
      indicadoresDeLaCartera(sinUnidades).map((i) => i.clave),
      ["por-completar"],
    );
  });

  it("sin edificios no hay indicadores", () => {
    assert.deepEqual(indicadoresDeLaCartera([]), []);
  });
});
