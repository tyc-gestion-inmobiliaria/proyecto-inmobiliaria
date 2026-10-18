import assert from "node:assert/strict";
import { test } from "node:test";

import { funnelSteps } from "../charts/chart-logic";
import { nextSort, sortBy, stageProgress, stageStatuses } from "./stage-logic";

const ETAPAS = ["a", "b", "c", "d"];

test("stageStatuses: lo de antes hecho, la actual en curso, lo de después por venir", () => {
  assert.deepEqual(stageStatuses(ETAPAS, "c"), ["done", "done", "current", "upcoming"]);
});

test("stageStatuses: perdida en la actual, y nada hecho si la etapa no existe", () => {
  assert.deepEqual(stageStatuses(ETAPAS, "b", true), ["done", "lost", "upcoming", "upcoming"]);
  assert.deepEqual(stageStatuses(ETAPAS, "x"), ["upcoming", "upcoming", "upcoming", "upcoming"]);
});

test("stageProgress cuenta la actual a medias", () => {
  assert.equal(stageProgress(ETAPAS, "a"), 0.125);
  assert.equal(stageProgress(ETAPAS, "d"), 0.875);
});

test("nextSort: ascendente, descendente, sin orden; otra columna arranca ascendente", () => {
  let s = nextSort(null, "precio");
  assert.deepEqual(s, { key: "precio", direction: "asc" });
  s = nextSort(s, "precio");
  assert.deepEqual(s, { key: "precio", direction: "desc" });
  assert.equal(nextSort(s, "precio"), null);
  assert.deepEqual(nextSort(s, "zona"), { key: "zona", direction: "asc" });
});

test("sortBy no distingue tildes ni mayúsculas y no toca la original", () => {
  const filas = ["Óscar", "ana", "Bruno"];
  assert.deepEqual(sortBy(filas, (x) => x, "asc"), ["ana", "Bruno", "Óscar"]);
  assert.deepEqual(filas, ["Óscar", "ana", "Bruno"]);
  assert.deepEqual(sortBy([3, 1, 2], (x) => x, "desc"), [3, 2, 1]);
});

test("funnelSteps: conversión contra la anterior y contra la primera", () => {
  const p = funnelSteps([200, 80, 20, 5]);
  assert.equal(p[0].fromPrevious, null);
  assert.equal(p[1].fromPrevious, 0.4);
  assert.equal(p[2].fromFirst, 0.1);
  assert.equal(p[3].fromPrevious, 0.25);
  assert.equal(funnelSteps([0, 0])[1].fromPrevious, null);
});
