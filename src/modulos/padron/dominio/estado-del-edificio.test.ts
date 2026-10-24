import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { estadoDelPadron } from "./estado-del-edificio";

const completo = { unidades: 3, sinParticipacion: 0, total: 100, diferencia: 0, sumaCien: true };

describe("estadoDelPadron", () => {
  it("con unidades al 100 % y una cuenta, está completo", () => {
    assert.deepEqual(estadoDelPadron(completo, 1), { listo: true, texto: "Padrón completo", faltan: [] });
  });

  it("dice lo primero que falta y guarda el resto", () => {
    const r = estadoDelPadron({ ...completo, sinParticipacion: 2, sumaCien: false, total: 60 }, 0);
    assert.equal(r.listo, false);
    assert.equal(r.texto, "2 unidades sin participación");
    assert.deepEqual(r.faltan, ["2 unidades sin participación", "Sin cuenta bancaria"]);
  });

  it("sin unidades no revisa la participación", () => {
    assert.deepEqual(estadoDelPadron({ unidades: 0, sinParticipacion: 0, total: 0, diferencia: 100, sumaCien: false }, 1).faltan, ["Sin unidades"]);
  });

  it("si la suma no da 100 lo dice con el total", () => {
    assert.match(estadoDelPadron({ ...completo, total: 92.5, sumaCien: false }, 1).texto, /^La participación suma 92.5 %$/);
  });
});
