import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { diasEntre, nombreDelMes, textoDeDia, textoDeFecha, textoDeHace, textoDeSoles } from "./formato";

describe("formato de pantalla", () => {
  it("escribe soles desde céntimos", () => {
    assert.equal(textoDeSoles(123450), "S/ 1,234.50");
    assert.equal(textoDeSoles(0), "S/ 0.00");
  });

  it("escribe fechas y días", () => {
    assert.equal(textoDeFecha("2026-10-24"), "24/10/2026");
    assert.equal(textoDeDia("2026-10-24"), "sáb 24 oct");
    assert.equal(nombreDelMes("2026-09"), "setiembre");
  });

  it("cuenta días y dice hace cuánto", () => {
    assert.equal(diasEntre("2026-10-20", "2026-10-24"), 4);
    assert.equal(diasEntre("2026-10-24", "2026-10-20"), -4);
    assert.equal(textoDeHace("2026-10-24", "2026-10-24"), "hoy");
    assert.equal(textoDeHace("2026-10-23", "2026-10-24"), "ayer");
    assert.equal(textoDeHace("2026-10-21", "2026-10-24"), "hace 3 días");
  });
});
