# ADR-005. Un solo repositorio, sin monorepo con espacios de trabajo

**Estado:** aceptada.
**Decisión:** un repo con la app Expo, `supabase/` (migraciones, funciones, pruebas, semilla) y `e2e/`.
**Consecuencias:** un PR lleva la migración, la función y la pantalla juntas. Se pasa a un monorepo (npm workspaces) solo cuando aparezca un segundo paquete desplegable, por ejemplo un sitio comercial.

```
/
  src/app/               rutas de Expo Router (solo rutas)
  src/modulos/           un módulo por flujo (dominio, aplicacion, infraestructura, ui)
  src/ui/                el kit de componentes (de JTM_templates)
  supabase/
    migrations/          SQL versionado
    functions/           Edge Functions
    tests/               pruebas pgTAP (RLS, cierre, auditoría)
    seed.sql             datos de ejemplo para local
  e2e/                   pruebas de punta a punta (Playwright para web)
  .github/workflows/     CI/CD
  app.config.ts, eas.json
```

---

Fecha: 2026-10-17. Sale de [Arquitectura, sección 9](../arquitectura.md#9-decisiones-adr).
