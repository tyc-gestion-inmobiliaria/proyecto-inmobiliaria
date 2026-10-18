# ADR-006. Lógica de dinero en el servidor

**Estado:** aceptada.
**Decisión:** el cierre, el prorrateo y las moras se calculan en funciones de Postgres llamadas por RPC o desde Edge Functions.
**Consecuencias:** un solo lugar donde la regla es cierta, probado con pgTAP. El cliente puede mostrar una vista previa, pero el número que vale es el del servidor.

---

Fecha: 2026-10-17. Sale de [Arquitectura, sección 9](../arquitectura.md#9-decisiones-adr).
