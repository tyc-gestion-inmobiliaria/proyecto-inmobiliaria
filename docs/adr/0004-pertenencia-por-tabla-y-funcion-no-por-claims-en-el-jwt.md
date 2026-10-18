# ADR-004. Pertenencia por tabla y función, no por claims en el JWT

**Estado:** aceptada.
**Contexto:** un usuario puede pertenecer a varias administradoras y perder el acceso en cualquier momento.
**Decisión:** la RLS consulta `membresia` a través de `private.mis_orgs()`.
**Consecuencias:** quitar un acceso tiene efecto inmediato, sin esperar a que caduque un token. Costo: una consulta por política, que Postgres cachea dentro de la sentencia al envolverla en `select`. Si el rendimiento lo exige, se agrega un claim con un *Custom Access Token Hook* sin cambiar las políticas.

---

Fecha: 2026-10-17. Sale de [Arquitectura, sección 9](../arquitectura.md#9-decisiones-adr).
