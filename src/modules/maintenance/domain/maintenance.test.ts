import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { contarPorEstado, validarTarea, diasParaLaTarea, estadoDeLaTarea, marcarHecha, ordenarCronograma, sumarMeses, textoDeFrecuencia, type TareaDeMantenimiento } from "./maintenance";

function tarea(id: string, proxima: string, frecuenciaMeses = 3): TareaDeMantenimiento {
  return { id, edificioId: "e", equipoId: "q", tarea: "Revisión", frecuenciaMeses, ultima: null, proxima };
}

describe("mantenimiento", () => {
  it("dice si una tarea está vencida, por vencer o al día", () => {
    assert.equal(estadoDeLaTarea(tarea("a", "2026-10-20"), "2026-10-24"), "vencida");
    assert.equal(diasParaLaTarea(tarea("a", "2026-10-20"), "2026-10-24"), -4);
    assert.equal(estadoDeLaTarea(tarea("b", "2026-10-24"), "2026-10-24"), "por_vencer");
    assert.equal(estadoDeLaTarea(tarea("c", "2026-11-08"), "2026-10-24"), "por_vencer");
    assert.equal(estadoDeLaTarea(tarea("d", "2026-11-09"), "2026-10-24"), "al_dia");
  });

  it("suma meses sin pasarse del fin de mes", () => {
    assert.equal(sumarMeses("2026-10-24", 3), "2027-01-24");
    assert.equal(sumarMeses("2026-01-31", 1), "2026-02-28");
    assert.equal(sumarMeses("2026-08-31", 6), "2027-02-28");
  });

  it("al marcarla hecha cuenta desde el día en que se hizo", () => {
    const r = marcarHecha(tarea("a", "2026-10-01", 6), "2026-10-24");
    assert.equal(r.ultima, "2026-10-24");
    assert.equal(r.proxima, "2027-04-24");
  });

  it("ordena por fecha y cuenta por estado", () => {
    const lista = [tarea("tarde", "2027-01-01"), tarea("vencida", "2026-10-01"), tarea("pronto", "2026-10-30")];
    assert.deepEqual(ordenarCronograma(lista).map((t) => t.id), ["vencida", "pronto", "tarde"]);
    assert.deepEqual(contarPorEstado(lista, "2026-10-24"), { vencida: 1, por_vencer: 1, al_dia: 1 });
  });

  it("escribe la frecuencia en palabras", () => {
    assert.equal(textoDeFrecuencia(1), "Mensual");
    assert.equal(textoDeFrecuencia(12), "Anual");
    assert.equal(textoDeFrecuencia(4), "Cada 4 meses");
  });
});

describe("programar una tarea", () => {
  const hoy = "2026-10-24";
  const datos = { equipoId: "q", tarea: " Revisión ", frecuenciaMeses: 3, proxima: "30/10/2026" };

  it("con todo, la deja lista con la fecha en ISO y el texto sin espacios de más", () => {
    assert.deepEqual(validarTarea(datos, hoy), { ok: true, tarea: { equipoId: "q", tarea: "Revisión", frecuenciaMeses: 3, proxima: "2026-10-30" } });
  });

  it("dice qué falta en cada campo", () => {
    const r = validarTarea({ equipoId: undefined, tarea: "", frecuenciaMeses: undefined, proxima: "" }, hoy);
    assert.equal(r.ok, false);
    if (!r.ok) assert.deepEqual(Object.keys(r.errores).sort(), ["equipoId", "frecuenciaMeses", "proxima", "tarea"]);
  });

  it("no programa la primera vez en el pasado ni con una fecha que no existe", () => {
    const pasada = validarTarea({ ...datos, proxima: "23/10/2026" }, hoy);
    assert.equal(!pasada.ok && pasada.errores.proxima, "La fecha no puede ser anterior a hoy.");
    const rara = validarTarea({ ...datos, proxima: "31/02/2027" }, hoy);
    assert.equal(!rara.ok && rara.errores.proxima, "Escribe la fecha como 24/10/2026.");
  });
});
