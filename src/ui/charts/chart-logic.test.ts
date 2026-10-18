import assert from "node:assert/strict";
import { test } from "node:test";

import { lightTheme } from "../tokens";
import { arcPath, binValues, compactNumber, labelStep, niceTicks, scaleLinear, seriesColor, sequentialStep, squarify } from "./chart-logic";

test("niceTicks redondea el tope y deja marcas que se leen", () => {
  const r = niceTicks(0, 937);
  assert.deepEqual(r.ticks, [0, 250, 500, 750, 1000]);
  assert.equal(r.max, 1000);
});

test("niceTicks incluye el cero aunque todo sea negativo o positivo", () => {
  const r = niceTicks(-120, 80);
  assert.ok(r.ticks.includes(0));
  assert.ok(r.min <= -120 && r.max >= 80);
});

test("niceTicks no se rompe sin datos ni con todo en cero", () => {
  assert.deepEqual(niceTicks(0, 0).ticks, [0, 1]);
  assert.deepEqual(niceTicks(Number.NaN, 5).ticks, [0]);
});

test("scaleLinear lleva el dominio al rango, también invertido", () => {
  const y = scaleLinear([0, 100], [200, 0]);
  assert.equal(y(0), 200);
  assert.equal(y(100), 0);
  assert.equal(y(50), 100);
});

test("compactNumber abrevia sin perder el signo", () => {
  assert.equal(compactNumber(1234567), "1.2M");
  assert.equal(compactNumber(45200), "45.2k");
  assert.equal(compactNumber(-980), "−980");
  assert.equal(compactNumber(0), "0");
});

test("labelStep salta etiquetas cuando no caben", () => {
  assert.equal(labelStep(10, 1000), 1);
  assert.equal(labelStep(31, 300), 6);
});

test("seriesColor sigue a la posición y manda el noveno a Otras", () => {
  const p = lightTheme.color.chart.series;
  assert.equal(seriesColor(p, 0, "gris"), p[0]);
  assert.equal(seriesColor(p, 8, "gris"), "gris");
});

test("sequentialStep: más es más oscuro, cero no pinta", () => {
  const ramp = ["a", "b", "c"];
  assert.equal(sequentialStep(ramp, 0, 10), null);
  assert.equal(sequentialStep(ramp, 1, 10), "a");
  assert.equal(sequentialStep(ramp, 10, 10), "c");
});

test("squarify reparte toda el área en proporción", () => {
  const items = [6, 6, 4, 3, 2, 2, 1];
  const rects = squarify(items, (v) => v, 600, 400);
  assert.equal(rects.length, items.length);
  const area = rects.reduce((s, r) => s + r.w * r.h, 0);
  assert.ok(Math.abs(area - 600 * 400) < 1);
  for (const r of rects) {
    assert.ok(Math.abs(r.w * r.h - (r.item / 24) * 600 * 400) < 1);
    assert.ok(r.x >= -0.01 && r.y >= -0.01 && r.x + r.w <= 600.01 && r.y + r.h <= 400.01);
  }
});

test("squarify descarta lo que vale cero", () => {
  assert.equal(squarify([0, 5], (v) => v, 100, 100).length, 1);
});

test("arcPath dibuja un tramo cerrado y una vuelta entera", () => {
  assert.match(arcPath(50, 50, 40, 25, 0, Math.PI / 2), /^M.* A.* L.* A.* Z$/);
  assert.match(arcPath(50, 50, 40, 25, 0, Math.PI * 2), /Z M/);
});

test("binValues cuenta todo y alinea un borde con el umbral", () => {
  const valores = [100, 250, 400, 900, 1400, 1500, 1600, 5000];
  const bins = binValues(valores, 10, 1500);
  assert.equal(bins.reduce((s, b) => s + b.count, 0), valores.length);
  assert.ok(bins.some((b) => Math.abs(b.to - 1500) < 1e-6));
  // Justo en el umbral cuenta abajo.
  const bajo = bins.filter((b) => b.to <= 1500).reduce((s, b) => s + b.count, 0);
  assert.equal(bajo, 6);
});

test("la cifra dentro de una celda de calor pasa 4.5:1 en los dos temas", async () => {
  const { contrastRatio } = await import("../theme/contrast");
  const { darkTheme } = await import("../tokens");
  for (const tema of [lightTheme, darkTheme]) {
    const desde = tema.scheme === "light" ? 4 : 3;
    tema.color.chart.sequential.forEach((paso, i) => {
      const tinta = i >= desde ? tema.color.text.onAccent : tema.color.text.primary;
      assert.ok(contrastRatio(tinta, paso) >= 4.5, `${tema.name} paso ${i}: ${contrastRatio(tinta, paso).toFixed(2)}`);
    });
  }
});

test("touchOutset lleva lo chico a 44 sumando el borde, y no toca lo que ya llega", async () => {
  const { touchOutset } = await import("../pressable-state");
  assert.equal(touchOutset(38, 44), 4);
  assert.equal(touchOutset(32, 44, 0), 6);
  assert.equal(touchOutset(44, 44), 0);
  assert.equal(touchOutset(undefined, 44), 0);
});
