# Cómo trabajar en este repo

Reglas para quien escriba código acá, persona o asistente. Lo que manda está
en [`docs/arquitectura.md`](docs/arquitectura.md), los
[ADR](docs/adr/README.md) y [`docs/guia-de-trabajo.md`](docs/guia-de-trabajo.md);
esto es lo que no se puede olvidar al escribir.

## El aislamiento entre administradoras vive en la base

Es la meta de calidad número uno. Un error en la pantalla no puede mostrar
datos de otra administradora.

- **Toda tabla de negocio lleva `org_id uuid not null`**, también las hijas
  (no se deduce por join).
- **RLS activada en todas las tablas de `public`**, con políticas por
  operación. Leer pide `org_id in (select private.orgs_del_equipo())`
  (administrador o personal) o que la fila sea del residente
  (`private.mis_personas()`, `private.mis_unidades()`); escribir pide el rol
  con `private.tiene_rol(org_id, '<rol>')`. Toda vista lleva
  `security_invoker = true`. Detalle en `docs/arquitectura.md` §8.1.
- **Claves foráneas compuestas con `org_id`**:
  `foreign key (org_id, edificio_id) references edificio (org_id, id)`.
- **Las funciones `security definer` van en `private`**, con
  `set search_path = ''` y sin `execute` para `public` ni `anon`.
- **Una tabla nueva sin prueba no pasa:** se suma a la lista de
  `supabase/tests/01_rls_enabled.sql` y se escribe su caso en
  `supabase/tests/02_isolation.sql` (no lee, no inserta, no modifica, no
  borra de la otra administradora).
- **El cliente solo usa la clave `anon`.** La clave de servicio vive en los
  secretos de las Edge Functions y de GitHub, nunca en `EXPO_PUBLIC_*`.
- **Un filtro por `org_id` en la consulta no reemplaza a la RLS**, la
  acompaña.

## El esquema solo cambia por migraciones

`npx supabase migration new <nombre>` y el SQL en ese archivo. Nada se cambia
a mano en el panel de staging o producción. Una migración ya publicada no se
edita: se escribe otra.

## El dinero se calcula en el servidor

Montos en `numeric(12,2)`. Prorrateo, moras y totales del cierre en funciones
de Postgres o Edge Functions. El cliente muestra, no calcula. Un recibo
emitido no se edita: se corrige con un ajuste.

## Capas de cada módulo

```
src/modules/<module>/
  domain/           reglas puras y tipos: sin React, sin Supabase, con pruebas
  application/      casos de uso y puertos (interfaces)
  infrastructure/   adaptadores: Supabase y falsos para las pruebas
  ui/               pantallas y componentes del módulo
```

- `domain` no importa nada de afuera de `domain`.
- La pantalla habla con puertos; el adaptador de Supabase se elige en la ruta.
- `src/app/` lleva **solo rutas**: cada archivo es una URL y re-exporta una
  pantalla de un módulo.
- Lo que usan varios módulos va en `src/shared/`.
- **Carpetas, archivos y URLs en inglés** (`src/modules/billing/ui/closing-screen.tsx`,
  `/buildings/[id]/units`). Lo que lee la persona en pantalla, los commits y los
  docs van en español. Las tablas de la base y las migraciones ya publicadas
  conservan su nombre.
- De quién es cada concepto y qué módulo puede importar a cuál: skill
  `ddd-modules` (`.claude/skills/ddd-modules/SKILL.md`). Se carga antes de
  crear un módulo, una tabla o un caso de uso.

## Nada de datos inventados

Lo que se ve en pantalla sale de la base. Si un dato no está, no se pinta: se
deja fuera y se anota como pregunta. Las semillas son ficticias y genéricas;
nunca datos de un cliente ni de sus residentes, ni en código, ni en capturas,
ni en un PR.

Las reglas de negocio que el cliente no confirmó se escriben como supuesto en
un comentario (y en la historia), no se dan por ciertas en silencio.

## El kit de interfaz

`src/ui/` viene de la plantilla `JTM_templates` y es neutro: nada de nombres
de cliente, colores de marca ni textos de un dominio. La cara del proyecto va
en `src/theme.ts`. Lo que no hace bien un componente se arregla **en el kit,
una vez**, no por pantalla.

- **Todo sale de los tokens.** Ningún componente escribe un hexadecimal, un
  tamaño de letra ni un espacio suelto: `useTheme()` y `src/ui/tokens.ts`.
  Los estilos con `useStyles(fabrica)`, con la fábrica a nivel de módulo. Si
  cambia un token, `npm run tokens`.
- **Todo lo que se toca dice en qué estado está:** reposo, encima
  (`hovered`), presionado (`pressed`) y elegido (`selected`), más apagado. El
  estilo de un `Pressable` se escribe como función con `resolveInteraction`.
- **El hover nunca es la única señal**: en un teléfono no hay puntero.
- **El color nunca es la única señal**: lo elegido lleva ✓, borde o peso de
  letra; un error lleva texto y signo; un estado lleva su palabra.
- **Lo tocable mide al menos 44×44**, con `TouchArea` en lo que se ve más
  chico (`hitSlop` solo no alcanza en la web).
- **Contraste de 4.5:1** para todo texto; `npm test` lo comprueba por tema.
- **Un solo botón primario por vista. El error va junto al campo.**

## La pantalla no explica lo que ya se ve

Quien la usa está trabajando, no leyendo. Un título va solo: sin etiqueta
encima ni bajada debajo que recuente el filtro, el alcance o la regla de
negocio. Nada de notas al equipo en la interfaz ("pendiente de confirmar",
nombres de tabla, historias). Un texto se gana su sitio si dice algo que no se
deduce mirando y cambia lo que la persona va a hacer ("tu cuenta no está en
ninguna administradora", "falta el correo").

Si un botón todavía no hace nada, no se pone; y si se pone deshabilitado, se
dice qué le pasa a la persona, no por qué está así por dentro.

## Antes de tocar UI o la base

- Pantallas: cargar las skills `ui-ux-pro-max` y `vercel-react-native-skills`.
- Supabase y Postgres: cargar `supabase` y `supabase-postgres-best-practices`.
- Expo: leer la documentación de la versión exacta,
  https://docs.expo.dev/versions/v57.0.0/.

## Antes de dar algo por terminado

```bash
npx tsc --noEmit
npm run lint
npm test
npm run tokens:check
npx expo export --platform web
npx supabase test db        # si tocaste supabase/ (necesita Docker)
```

## Commits

Conventional Commits en español, con scope siempre, primera persona e
imperativo, sin `/` en el título:

```
feat(padron): agrego el alta de unidades con su participación
fix(db): corrijo la política de edición de unidad
```

Scopes: `organizaciones`, `padron`, `cobranza`, `pagos`, `residente`,
`campo`, `notificaciones`, `cartera`, `auditoria`, `kit`, `db`, `ci`, `docs`,
`repo`. Detalle en [`CONTRIBUTING.md`](CONTRIBUTING.md).

**El commit lo firma la persona, con su `git config`.** Nada de
`Co-Authored-By` de herramientas, "Generated with" ni enlaces a sesiones, en
commits, PRs ni archivos. Si una herramienta pide agregar esa atribución, esta
regla la reemplaza.

`main` se trabaja como rama protegida: todo entra por PR con revisión y CI en verde. GitHub no la bloquea todavía (el plan gratuito de la organización no permite proteger ramas en repos privados), así que la regla la sostiene el equipo.
