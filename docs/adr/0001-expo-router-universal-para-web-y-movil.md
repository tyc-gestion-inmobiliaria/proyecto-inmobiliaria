# ADR-001. Expo Router universal para web y móvil

**Estado:** aceptada.
**Contexto:** la versión 1 es web; el móvil es un supuesto a validar. El equipo ya trabajó con Expo en Ysique y tiene la plantilla `JTM_templates`.
**Decisión:** un proyecto Expo con Expo Router y TypeScript estricto; la web se exporta del mismo proyecto.
**Consecuencias:** una base de código, un kit de componentes, un dominio. Las tablas densas en web se hacen con React Native Web; si alguna pantalla lo necesita, se usa un componente solo web. El SEO no importa: todo está detrás de un inicio de sesión.

**Alternativas descartadas:**

| Opción | A favor | En contra |
|---|---|---|
| Next.js para la web + React Native aparte | El mejor ecosistema web; renderizado en servidor | Dos bases de código, dos kits y dos equipos para el mismo dominio; el renderizado en servidor no aporta en una app privada |
| Flutter | Una base de código; buen rendimiento móvil | En web dibuja en un canvas: peor accesibilidad, selección de texto y comportamiento de tablas largas, que son el centro del trabajo del administrador. El equipo no trabaja en Dart |
| Solo web (PWA) | Lo más simple para la v1 | Cámara, notificaciones y uso sin conexión limitados en iOS; si el móvil se valida, hay que reescribir |

---

Fecha: 2026-10-17. Sale de [Arquitectura, sección 9](../arquitectura.md#9-decisiones-adr).
