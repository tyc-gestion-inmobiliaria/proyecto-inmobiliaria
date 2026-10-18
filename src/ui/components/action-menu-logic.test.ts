import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { menuPosition, orderActions } from "./action-menu-logic";

describe("orderActions", () => {
  it("manda las destructivas al final sin cambiar el orden de las demás", () => {
    const items = [
      { key: "quitar", destructive: { question: "¿Quitar?", confirmLabel: "Sí, quitar" } },
      { key: "editar" },
      { key: "copiar" },
    ];
    assert.deepEqual(
      orderActions(items).map((i) => i.key),
      ["editar", "copiar", "quitar"],
    );
  });
});

describe("menuPosition", () => {
  const ventana = { width: 400, height: 800 };
  const menu = { width: 220, height: 150 };

  it("se abre debajo, alineado a la derecha del botón", () => {
    const p = menuPosition({ x: 250, y: 100, width: 100, height: 40 }, menu, ventana);
    assert.deepEqual(p, { top: 144, left: 130 });
  });

  it("si no cabe debajo, se abre encima", () => {
    const p = menuPosition({ x: 250, y: 700, width: 100, height: 40 }, menu, ventana);
    assert.equal(p.top, 700 - 4 - 150);
  });

  it("no se sale por la izquierda", () => {
    const p = menuPosition({ x: 0, y: 100, width: 60, height: 40 }, menu, ventana);
    assert.equal(p.left, 8);
  });
});
