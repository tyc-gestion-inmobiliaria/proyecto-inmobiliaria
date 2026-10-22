# Plataforma de administración de edificios

SaaS multiinquilino para administradoras de edificios: cada administradora
opera aislada de las demás, con su cartera de edificios, unidades, personas y
la cobranza mensual. Una sola base de código para la web del administrador y,
cuando se valide, las apps de iOS y Android.

El porqué de cada decisión está en [`docs/arquitectura.md`](docs/arquitectura.md)
y en los [ADR](docs/adr/README.md). Cómo trabaja el equipo, en
[`docs/guia-de-trabajo.md`](docs/guia-de-trabajo.md) y en
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## Pila

| | |
|---|---|
| App | Expo SDK 57 con Expo Router, React Native 0.86, React 19.2, React Native Web 0.21 |
| Lenguaje | TypeScript 6, `strict` |
| Backend | Supabase: Postgres 17 con RLS, Auth, Storage, Edge Functions |
| Pruebas | `node:test` para el dominio y el kit; pgTAP (`supabase test db`) para la base |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |
| Kit de interfaz | `src/ui/`, copiado de la plantilla `JTM_templates` |

Requisitos: Node.js 22.13 o más nuevo (el CI usa 24), Docker Desktop para la
base local. La CLI de Supabase viene como dependencia de desarrollo
(`npx supabase …`).

## Dónde va cada cosa

```
src/
  app/                 rutas de Expo Router: solo rutas, cada archivo es una URL
    _layout.tsx        tema, sesión, y qué rutas existen con y sin sesión
    entrar.tsx         /entrar, el inicio de sesión
    (app)/             lo que pide sesión: el marco con el menú por secciones
  modulos/<modulo>/    un módulo por flujo
    dominio/           reglas puras y tipos, sin React ni Supabase, con sus pruebas
    aplicacion/        casos de uso y puertos (interfaces de repositorio)
    infraestructura/   adaptadores: Supabase, y falsos para las pruebas
    ui/                pantallas y componentes del módulo
  compartido/          lo que usan varios módulos: el cliente de Supabase, el marco, las secciones
  ui/                  el kit: tokens, tema, componentes, gráficas
  tema.ts              la cara de este proyecto sobre el tema neutro del kit
supabase/
  config.toml          la base local
  migrations/          el esquema, solo por migraciones versionadas
  tests/               pruebas pgTAP: RLS obligatoria, aislamiento, integridad
  seed.sql             datos ficticios para la base local
docs/                  arquitectura, guía de trabajo, entornos y ADR
tokens/                los tokens del kit en JSON para Figma (generados)
```

Módulos de hoy: `organizaciones` (sesión, membresías y roles), `padron`
(edificios, unidades, personas, cuentas bancarias y la ficha de la unidad),
`cobranza` (el cierre mensual en cuatro pasos, los recibos y el estado de
cuenta) y `cartera` (el inicio, con el paso del cierre de cada edificio).
Vendrá `auditoria`.

La cobranza no importa de otros módulos: lo que comparte va en
`src/compartido/` y, cuando una pantalla junta dos módulos (la ficha de la
unidad, con el padrón y la cobranza), los junta la ruta de `src/app/`. La
cartera sí lee la lista de edificios del padrón, desde antes.

El dinero lo calcula la base: `recibos_del_cierre` arma la vista previa
(prorrateo por participación al céntimo, agua por consumo, deuda previa) y
`emitir_cierre` la congela en `recibo` en una transacción, con numeración
correlativa por edificio y sin duplicar si se repite. El cliente solo repite
el prorrateo para mostrar la cuota mientras se escribe el presupuesto.

## Correr el proyecto

### Primera vez

```bash
npm install
cp .env.example .env.local
npx supabase start          # Postgres, Auth, Storage y Studio en Docker
```

`supabase start` imprime la URL de la API y la clave `anon` (o *publishable*):
van en `.env.local` como `EXPO_PUBLIC_SUPABASE_URL` y
`EXPO_PUBLIC_SUPABASE_ANON_KEY`. La clave de servicio nunca va ahí.

La semilla deja cuatro cuentas locales, todas con la contraseña
`clave-local-123`:

| Cuenta | Qué ve |
|---|---|
| `admin.a@ejemplo.test` | Administrador de "Administradora Demo A", con un edificio |
| `personal.a@ejemplo.test` | Personal de "Administradora Demo A" |
| `admin.b@ejemplo.test` | Administrador de "Administradora Demo B", sin edificios |
| `sin.membresia@ejemplo.test` | Una cuenta que no pertenece a ninguna administradora |

El correo de "¿Olvidaste tu contraseña?" no sale a internet: llega a Mailpit,
en http://127.0.0.1:54324.

### Web

```bash
npx expo start --web        # http://localhost:8081
```

### Teléfono

```bash
npx expo start              # Expo Go o un development build
```

Desde el teléfono, `127.0.0.1` es el propio teléfono: en `.env.local` la URL de
Supabase tiene que ser la IP de la máquina en la red local.

### Base de datos

```bash
npx supabase db reset                 # base desde cero: migraciones + semilla
npx supabase migration new <nombre>   # migración nueva, vacía, para escribir el SQL
npx supabase test db                  # pruebas pgTAP
npx supabase db lint                  # lint del esquema
npx supabase stop                     # apaga los contenedores
```

Si la máquina va justa de memoria, se puede levantar solo lo que piden las
pruebas:

```bash
npx supabase start -x realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run web` | La app en el navegador (`expo start --web`) |
| `npm start` | El servidor de Expo para el teléfono |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` |
| `npm test` | Pruebas del dominio y del kit, incluido el contraste de cada tema |
| `npm run tokens` | Regenera `tokens/` desde `src/ui/tokens.ts` |
| `npm run tokens:check` | Falla si `tokens/` no está al día (lo corre el CI) |
| `npm run claves:check` | Falla si una clave de servicio quedó en el repositorio o en una `EXPO_PUBLIC_*` (lo corre el CI) |
| `npm run build:web` | Exporta la web estática a `dist/` |
| `npm run db:start` / `db:reset` / `db:test` / `db:lint` | Atajos de la CLI de Supabase |

El CI corre `tsc`, lint, pruebas, `tokens:check`, `claves:check` y la
exportación de la web en un job, y en otro levanta la base desde cero y corre `supabase db lint` y
`supabase test db`.

## Entornos

| Entorno | Base | Web |
|---|---|---|
| Local | `supabase start` en Docker | `npx expo start --web` |
| Staging | Proyecto Supabase propio (por crear); migraciones desde `main` con `staging.yml` | Desde `main` (hosting por decidir, ADR-007) |
| Producción | Proyecto Supabase propio, `sa-east-1` (por crear) | Al publicar una etiqueta `vX.Y.Z` |

Las variables `EXPO_PUBLIC_*` se fijan al construir: cambiar de entorno pide
construir otra vez. Cómo se crea y se enlaza staging, en
[`docs/entornos.md`](docs/entornos.md).
