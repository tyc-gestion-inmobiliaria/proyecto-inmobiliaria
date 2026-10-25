import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { accionesDeLaReserva, diasReservables, porDia, proximas, puedeCambiar, turnosOcupados, validarReserva, type Reserva } from "./reservation";

function res(id: string, extra: Partial<Reserva> = {}): Reserva {
  return { id, edificioId: "e", areaId: "a1", unidadId: "u1", unidadNumero: "101", fecha: "2026-10-25", turno: "noche", estado: "pendiente", ...extra };
}

const UNIDADES = [
  { id: "u1", numero: "101", alDia: true },
  { id: "u2", numero: "102", alDia: false },
];

describe("reservas", () => {
  it("ofrece confirmar y cancelar según el estado", () => {
    assert.deepEqual(accionesDeLaReserva("pendiente"), ["confirmar", "cancelar"]);
    assert.deepEqual(accionesDeLaReserva("confirmada"), ["cancelar"]);
    assert.deepEqual(accionesDeLaReserva("cancelada"), []);
    assert.equal(puedeCambiar("cancelada", "confirmada"), false);
  });

  it("las canceladas no ocupan el turno", () => {
    const r = [res("1"), res("2", { turno: "tarde", estado: "cancelada" })];
    assert.deepEqual([...turnosOcupados(r, "a1", "2026-10-25")], ["noche"]);
  });

  it("solo reserva una unidad al día", () => {
    const e = validarReserva({ areaId: "a1", unidadId: "u2", fecha: "2026-10-26", turno: "manana" }, { hoy: "2026-10-24", reservas: [], unidades: UNIDADES });
    assert.match(e.unidadId ?? "", /deuda vencida/);
    assert.deepEqual(Object.keys(e), ["unidadId"]);
  });

  it("no acepta un día pasado ni un turno tomado", () => {
    const e = validarReserva({ areaId: "a1", unidadId: "u1", fecha: "2026-10-20", turno: "noche" }, { hoy: "2026-10-24", reservas: [], unidades: UNIDADES });
    assert.equal(e.fecha, "El día ya pasó.");
    const t = validarReserva({ areaId: "a1", unidadId: "u1", fecha: "2026-10-25", turno: "noche" }, { hoy: "2026-10-24", reservas: [res("1")], unidades: UNIDADES });
    assert.equal(t.turno, "Ese turno ya está reservado.");
  });

  it("reserva de hoy a dos semanas", () => {
    const d = diasReservables("2026-10-24");
    assert.equal(d[0], "2026-10-24");
    assert.equal(d.at(-1), "2026-11-07");
    const e = validarReserva({ areaId: "a1", unidadId: "u1", fecha: "2026-11-20", turno: "noche" }, { hoy: "2026-10-24", reservas: [], unidades: UNIDADES });
    assert.match(e.fecha ?? "", /anticipación/);
  });

  it("acepta una reserva completa", () => {
    assert.deepEqual(validarReserva({ areaId: "a1", unidadId: "u1", fecha: "2026-10-25", turno: "manana" }, { hoy: "2026-10-24", reservas: [res("1")], unidades: UNIDADES }), {});
  });

  it("ordena las próximas y las agrupa por día", () => {
    const r = proximas([res("b", { fecha: "2026-10-26" }), res("viejo", { fecha: "2026-10-01" }), res("a", { fecha: "2026-10-25", turno: "manana" }), res("c", { fecha: "2026-10-25" })], "2026-10-24");
    assert.deepEqual(r.map((x) => x.id), ["a", "c", "b"]);
    assert.deepEqual(porDia(r).map((g) => [g.fecha, g.reservas.length]), [
      ["2026-10-25", 2],
      ["2026-10-26", 1],
    ]);
  });
});
