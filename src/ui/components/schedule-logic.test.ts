import assert from "node:assert/strict";
import { test } from "node:test";

import { buildSlots, hourMarks, layoutLanes, minuteLabel, minuteToY } from "./schedule-logic";

test("minuteLabel escribe la hora con dos cifras", () => {
  assert.equal(minuteLabel(570), "09:30");
  assert.equal(minuteLabel(1200), "20:00");
});

test("buildSlots: cerrado fuera de los tramos, ocupado si algo lo pisa, libre si no", () => {
  const slots = buildSlots(540, 720, 30, [{ start: 540, end: 660 }], [{ start: 600, end: 615 }]);
  assert.deepEqual(
    slots.map((s) => s.state),
    ["free", "free", "busy", "free", "closed", "closed"],
  );
  assert.ok(buildSlots(0, 60, 30, undefined, []).every((s) => s.state === "free"), "sin tramos, todo abierto");
});

test("layoutLanes: lo que se cruza se reparte en carriles; lo que no, ocupa todo el ancho", () => {
  const lanes = layoutLanes([
    { key: "a", start: 540, end: 600 },
    { key: "b", start: 570, end: 630 },
    { key: "c", start: 600, end: 660 },
    { key: "d", start: 700, end: 760 },
  ]);
  assert.deepEqual(lanes.get("a"), { lane: 0, lanes: 2 });
  assert.deepEqual(lanes.get("b"), { lane: 1, lanes: 2 });
  assert.deepEqual(lanes.get("c"), { lane: 0, lanes: 2 }, "c entra en el carril que dejó a");
  assert.deepEqual(lanes.get("d"), { lane: 0, lanes: 1 });
});

test("hourMarks y minuteToY", () => {
  assert.deepEqual(hourMarks(530, 720), [540, 600, 660, 720]);
  assert.equal(minuteToY(600, 540, 30, 48), 96);
});
