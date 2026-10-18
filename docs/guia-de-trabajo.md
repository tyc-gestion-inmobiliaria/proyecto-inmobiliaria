JTM — IT & Business Analytics

DOCUMENTO INTERNO DEL EQUIPO

# Guía de trabajo del equipo

**T&C Administración y Gestión Inmobiliaria S.A.C.**

| | |
|---|---|
| Cliente | T&C Administración y Gestión Inmobiliaria S.A.C. |
| Preparado por | JTM — IT & Business Analytics |
| Versión | 0.1 |
| Fecha | 2026-10-17 |
| Estado | Borrador |
| Confidencialidad | Interno |
| Tipo | Guía del equipo |

---

## 1. Resumen

Cómo trabaja el equipo en este proyecto, en cinco reglas:

1. **`main` se trata como protegida.** Todo entra por pull request, con una revisión aprobada y el CI en verde. GitHub no lo bloquea mientras la organización siga en el plan gratuito.
2. **Una rama por historia**, con prefijo de tipo: `feat/…`, `fix/…`, `docs/…`.
3. **Conventional Commits en español**, con scope y en primera persona: `feat(cobranza): agrego la vista previa de recibos`.
4. **Una historia está lista para empezar** cuando cumple la Definición de Listo, y **está hecha** cuando cumple la de Hecho (sección 4). No hay "casi hecho".
5. **Scrum con sprints de dos semanas**, y el tablero es la única fuente de qué se está haciendo.

## 2. Flujo de Git

### 2.1 Ramas

| Rama | Para qué | Quién la crea |
|---|---|---|
| `main` | Lo que está en staging. Siempre desplegable | Nadie escribe directo |
| `feat/<id>-<descripcion>` | Una historia nueva: `feat/42-cierre-paso-3` | Quien toma la historia |
| `fix/<id>-<descripcion>` | Un defecto | Ídem |
| `docs/…`, `chore/…`, `refactor/…`, `test/…` | Lo que no es funcionalidad ni defecto | Ídem |
| `hotfix/<descripcion>` | Arreglo urgente en producción; sale de la última etiqueta y vuelve a `main` | Con acuerdo del líder técnico |

- La rama vive poco: idealmente se fusiona en menos de tres días. Si una historia necesita más, se parte.
- El `<id>` es el número de la historia en el tablero.
- Antes de pedir revisión, se actualiza con `main` (`git rebase main` en la rama propia; nunca sobre ramas de otro).

### 2.2 Protección de `main`

- Pull request obligatorio, con **al menos una aprobación** de alguien distinto del autor.
- CI en verde: tipos, lint, pruebas unitarias, pruebas de base de datos (incluidas las de aislamiento entre inquilinos) y build de la web.
- Conversaciones resueltas antes de fusionar.
- **Squash merge**: un commit por PR en `main`, con el título del PR como mensaje.
- Prohibido `push --force` a `main`. En la rama propia se permite `--force-with-lease`; en la rama de otro, nunca sin preguntar.

### 2.3 Mensajes de commit

Formato **Conventional Commits**: `tipo(scope): descripción`.

- **Tipo:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`, `perf`, `ci`.
- **Scope:** siempre, y es el módulo o área: `cobranza`, `padron`, `cartera`, `organizaciones`, `auditoria`, `kit`, `db`, `ci`, `docs`. Si un commit no tiene un scope claro, toca dos cosas y hay que partirlo.
- **Descripción:** en español, en primera persona, en presente, sin punto final y sin `/` (el título termina en nombres de rama y archivos).
- Cuerpo opcional: el porqué, no el qué.
- Un cambio que rompe compatibilidad lleva `!` después del scope y un pie `BREAKING CHANGE:`.
- El commit lo firma quien lo escribe, con su identidad de `git config`. No se agregan líneas de atribución a herramientas.

```
feat(cobranza): agrego la vista previa de recibos del paso 3
fix(padron): corrijo la suma de participaciones con unidades sin metraje
test(db): agrego la prueba de aislamiento de la tabla pago
feat(organizaciones)!: cambio la membresía a un rol por edificio
```

### 2.4 Pull requests

Título con el mismo formato que un commit. La descripción responde:

- **Qué cambia y por qué**, con el enlace a la historia del tablero.
- **Cómo se prueba**: pasos o pruebas nuevas.
- **Capturas** si cambia algo que se ve (web y, si aplica, teléfono).
- **Migraciones**: si hay, qué hacen y si son reversibles.
- **Riesgos**: qué podría romperse.

Un PR chico se revisa mejor: apuntar a menos de 400 líneas cambiadas sin contar migraciones generadas ni archivos de bloqueo.

### 2.5 Revisión

Quien revisa mira, en este orden: que haga lo que dice la historia; que no abra una fuga entre inquilinos (toda tabla nueva con `org_id`, RLS y su prueba); que el dinero se calcule en el servidor; que lo que se ve cumpla las reglas de accesibilidad; que tenga pruebas; y por último el estilo. Se responde en menos de un día hábil.

## 3. Versiones y despliegue

- Cada fusión a `main` despliega a **staging** de forma automática.
- Una versión a producción es una **etiqueta** `vX.Y.Z` (versionado semántico) sobre `main`, con aprobación manual en GitHub.
- Las notas de versión se generan de los commits del periodo, agrupadas por tipo.
- Detalle de entornos y del CI/CD en el documento de Arquitectura, sección 7.

## 4. Definición de Listo y de Hecho

### 4.1 Definición de Listo (una historia puede entrar al sprint)

- [ ] Está escrita como historia: quién, qué, para qué.
- [ ] Tiene **criterios de aceptación** verificables.
- [ ] Las reglas de negocio que necesita están respondidas por T&C, o la historia dice explícitamente qué supuesto usa.
- [ ] Si tiene pantalla: el wireframe o diseño está aprobado.
- [ ] Si toca la base: se sabe qué tablas cambian.
- [ ] Está estimada por el equipo y cabe en un sprint.
- [ ] No tiene dependencias bloqueantes abiertas.

### 4.2 Definición de Hecho (una historia se puede cerrar)

- [ ] Cumple todos sus criterios de aceptación.
- [ ] El código está fusionado en `main` por PR aprobado, con el CI en verde.
- [ ] Tiene pruebas: unitarias del dominio; pgTAP si toca la base, **incluida la de aislamiento entre inquilinos** para cada tabla nueva; punta a punta si cambia un flujo clave.
- [ ] Las migraciones aplican sobre una base vacía (`supabase db reset`) y sobre staging.
- [ ] Lo que se ve cumple las reglas de accesibilidad: contraste 4.5:1, texto base 14 px, estados con texto y no solo con color, un solo botón primario por vista.
- [ ] Funciona en staging y lo revisó el responsable de producto.
- [ ] Si cambió una regla, una decisión o una pregunta abierta, quedó anotado en la wiki del proyecto.
- [ ] Sin datos personales reales en código, semillas, capturas ni PR.

## 5. Cómo correr el proyecto

### 5.1 Requisitos

| Herramienta | Para qué |
|---|---|
| Node.js LTS y npm | La app y los scripts |
| Docker Desktop | Supabase local |
| Supabase CLI | Base local, migraciones, funciones, pruebas |
| EAS CLI (`npm i -g eas-cli`) | Solo para builds y actualizaciones móviles |
| Git | — |

### 5.2 Primera vez

```bash
git clone <url-del-repo>
cd <repo>
npm install
cp .env.example .env.local      # completar con lo que imprime `supabase start`
supabase start                  # levanta Postgres, Auth, Storage y Studio en Docker
supabase db reset               # aplica migraciones y la semilla de ejemplo
```

### 5.3 Día a día

| Comando | Qué hace |
|---|---|
| `npx expo start --web` | La app en el navegador |
| `npx expo start` | La app con Expo Go o un development build en el teléfono |
| `supabase db reset` | Base local desde cero con migraciones y semilla |
| `supabase migration new <nombre>` | Crea una migración vacía para escribir el SQL |
| `supabase db diff -f <nombre>` | Genera la migración a partir de cambios hechos en Studio local |
| `supabase test db` | Corre las pruebas pgTAP (RLS, cierre, auditoría) |
| `supabase functions serve` | Edge Functions en local |
| `npm run typecheck` / `npm run lint` / `npm test` / `npm run tokens:check` / `npm run build:web` | Lo mismo que corre el CI |
| `npm run e2e` | Pruebas punta a punta con Playwright (necesita la app y Supabase levantados). Se agrega con la primera historia que cambie un flujo clave |

Los scripts de `npm` están en `package.json` y en el README del repositorio. `npm run db:reset` y `npm run db:test` son atajos de `supabase db reset` y `supabase test db`.

### 5.4 Reglas del entorno

- La semilla tiene datos de ejemplo, nunca datos de T&C ni de sus residentes.
- La clave de servicio de Supabase no va en `.env.local` de la app; solo la usan las funciones.
- `.env*` no se commitea, salvo `.env.example` sin valores.

## 6. El tablero y Scrum

### 6.1 Ritmo

Sprints de **dos semanas**, de lunes a viernes de la semana siguiente.

| Ceremonia | Cuándo | Duración | Para qué |
|---|---|---|---|
| Planificación | Primer lunes del sprint | 2 h | Elegir del backlog lo que entra, con objetivo del sprint en una frase |
| Daily | Cada día, misma hora | 15 min | Qué hice, qué haré, qué me bloquea |
| Refinamiento | Miércoles de la segunda semana | 1 h | Dejar Listas las historias del próximo sprint |
| Revisión | Último viernes | 1 h | Mostrar lo Hecho en staging a T&C o al responsable de producto |
| Retrospectiva | Último viernes, después de la revisión | 45 min | Qué cambiar en la forma de trabajar; una acción concreta con dueño |

### 6.2 Columnas

| Columna | Entra cuando | Límite |
|---|---|---|
| Backlog del producto | Hay una necesidad, aunque esté verde | — |
| Listo | Cumple la Definición de Listo | — |
| Sprint | Se comprometió en la planificación | La capacidad del equipo |
| En curso | Alguien la tomó y abrió su rama | Una por persona |
| En revisión | Hay PR abierto | Revisar antes de tomar otra |
| En staging | Está fusionada y desplegada; falta que la vea producto | — |
| Hecho | Cumple la Definición de Hecho | — |

### 6.3 Reglas del tablero

- Cada tarjeta es una historia con su número; la rama y el PR llevan ese número.
- Etiquetas por módulo (las mismas que los scopes de commit) y por tipo (historia, defecto, deuda técnica, pregunta a T&C).
- Las preguntas a T&C también son tarjetas: se ve qué historia bloquean.
- Estimación en puntos de historia (Fibonacci: 1, 2, 3, 5, 8). Lo que pasa de 8 se parte.
- Lo que no está en el tablero no se está haciendo.
- La herramienta es GitHub Projects, salvo que el equipo decida otra; el backlog del producto vive también en la wiki del proyecto (página *product-backlog*).

### 6.4 Roles

| Rol | Responsabilidad |
|---|---|
| Responsable de producto | Ordena el backlog, acepta lo Hecho, es el puente con T&C |
| Facilitador (Scrum Master) | Cuida las ceremonias y quita bloqueos |
| Líder técnico | Cuida la arquitectura, aprueba cambios de esquema y decide los ADR |
| Equipo de desarrollo | Estima, construye, prueba y revisa |

Quién ocupa cada rol se define al armar el equipo.

## Fuentes

- Documentos `entregables/2026-10-17 Visión y alcance.md` y `entregables/2026-10-17 Arquitectura.md` de este proyecto.
- Convenciones de commits y de trabajo del proyecto Ysique (Conventional Commits con scope, en español; push y PR).

## Historial de versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 0.1 | 2026-10-17 | Primera versión. |
