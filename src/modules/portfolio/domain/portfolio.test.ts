import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  armarCartera,
  formatoPorcentaje,
  estadoDelEdificio,
  pasoDelCierre,
  pendientesDelEdificio,
  periodoEnCurso,
  resumenDelMes,
  tareasDeLaCartera,
  type EstadoDelPadron,
} from "./portfolio";

const completo: EstadoDelPadron = { unidades: 3, sinParticipacion: 0, total: 100, sumaCien: true };

describe("formatoPorcentaje", () => {
  it("usa punto decimal, como los montos, y quita los ceros de más", () => {
    assert.equal(formatoPorcentaje(100), "100 %");
    assert.equal(formatoPorcentaje(92.5), "92.5 %");
    assert.equal(formatoPorcentaje(33.3333), "33.3333 %");
  });
  it("no arrastra errores de coma flotante", () => {
    assert.equal(formatoPorcentaje(0.1 + 0.2), "0.3 %");
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
    assert.equal(p.causa, "La participación suma 92.5 %");
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

describe("pasoDelCierre", () => {
  it("dice qué toca en el cierre del mes y a qué paso lleva", () => {
    assert.deepEqual(pasoDelCierre(undefined), { texto: "Cargar lecturas", paso: 1 });
    assert.deepEqual(pasoDelCierre({ estado: "borrador", paso: 1 }), { texto: "Cargar lecturas", paso: 1 });
    assert.deepEqual(pasoDelCierre({ estado: "borrador", paso: 2 }), { texto: "Emitir recibos", paso: 2 });
    assert.deepEqual(pasoDelCierre({ estado: "emitido", paso: 4 }), { texto: "Mes emitido", paso: null });
  });

  it("toma el mes en curso con la hora de Lima", () => {
    // 1 de octubre a las 02:00 UTC todavía es 30 de septiembre en Lima.
    assert.equal(periodoEnCurso(new Date("2026-10-01T02:00:00Z")), "2026-09-01");
  });

  it("solo se pide con el padrón completo", () => {
    const [fila] = armarCartera([{ id: "e1", nombre: "Torre" }], new Map(), new Set());
    assert.equal(fila.cierre, null);
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

describe("estado, resumen y tareas de la cartera", () => {
  const edificios = [
    { id: "e1", nombre: "Al día" },
    { id: "e2", nombre: "En lecturas" },
    { id: "e3", nombre: "Sin cuenta" },
  ];
  const filas = armarCartera(
    edificios,
    new Map([
      ["e1", completo],
      ["e2", completo],
      ["e3", { ...completo, sinParticipacion: 1 }],
    ]),
    new Set(["e1", "e2"]),
    new Map([["e1", { estado: "emitido", paso: 4 }]]),
  );

  it("dice el estado de cada edificio", () => {
    assert.deepEqual(filas.map(estadoDelEdificio), ["al-dia", "en-cierre", "por-completar"]);
  });

  it("cuenta los edificios por estado", () => {
    assert.deepEqual(resumenDelMes(filas), { edificios: 3, alDia: 1, enCierre: 1, porCompletar: 1 });
    assert.deepEqual(resumenDelMes([]), { edificios: 0, alDia: 0, enCierre: 0, porCompletar: 0 });
  });

  it("pone primero lo del padrón y después el cierre, sin tareas para el que está al día", () => {
    const tareas = tareasDeLaCartera(filas);
    assert.deepEqual(
      tareas.map((t) => [t.edificioId, t.tipo, t.paso]),
      [
        ["e3", "sin-participacion", "Completar participación"],
        ["e3", "sin-cuenta", "Registrar cuenta bancaria"],
        ["e2", "cierre", "Cargar lecturas"],
      ],
    );
    assert.equal(tareas[2].pasoDelCierre, 1);
    assert.equal(tareas[2].causa, "Paso 1 de 4 del cierre");
  });

  it("los pagos por validar van al final, también del edificio que ya emitió", () => {
    const conPagos = armarCartera(
      edificios,
      new Map([
        ["e1", completo],
        ["e2", completo],
        ["e3", { ...completo, sinParticipacion: 1 }],
      ]),
      new Set(["e1", "e2"]),
      new Map([["e1", { estado: "emitido", paso: 4 }]]),
      new Map([["e1", 1], ["e3", 3]]),
    );
    const tareas = tareasDeLaCartera(conPagos);
    assert.deepEqual(
      tareas.slice(3).map((t) => [t.edificioId, t.tipo, t.causa]),
      [
        ["e1", "pagos", "1 pago por validar"],
        ["e3", "pagos", "3 pagos por validar"],
      ],
    );
  });
});
