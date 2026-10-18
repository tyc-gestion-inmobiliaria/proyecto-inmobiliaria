# ADR-002. Supabase como backend

**Estado:** aceptada.
**Contexto:** equipo chico, necesidad de base relacional (dinero, prorrateo, auditoría), aislamiento fuerte y archivos.
**Decisión:** Supabase gestionado: Postgres, Auth, Storage, Edge Functions.
**Consecuencias:** no hay servidor propio que mantener; la lógica sensible se escribe en SQL y en funciones Deno. Dependencia de un proveedor, mitigada porque el núcleo es Postgres estándar y se puede migrar con un volcado.
**Alternativas descartadas:** API propia (NestJS o similar) sobre Postgres gestionado, que da más control pero exige escribir y operar autenticación, archivos y permisos; Firebase, que no es relacional y hace difícil el dinero y los reportes.

---

Fecha: 2026-10-17. Sale de [Arquitectura, sección 9](../arquitectura.md#9-decisiones-adr).
