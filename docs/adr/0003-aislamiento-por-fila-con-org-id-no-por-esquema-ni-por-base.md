# ADR-003. Aislamiento por fila con `org_id`, no por esquema ni por base

**Estado:** aceptada.
**Contexto:** muchas administradoras chicas y medianas, mismo esquema para todas.
**Decisión:** una sola base, `org_id` en cada tabla y RLS.
**Consecuencias:** una migración sirve para todos los inquilinos; los reportes del operador son simples. El riesgo de fuga se cubre con RLS obligatoria y pruebas. Si un cliente grande exige base propia, se le da un proyecto Supabase aparte con el mismo código.
**Alternativas descartadas:** un esquema por inquilino (migraciones multiplicadas) y un proyecto por inquilino (costo y operación por cliente).

---

Fecha: 2026-10-17. Sale de [Arquitectura, sección 9](../arquitectura.md#9-decisiones-adr).
