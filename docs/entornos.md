# Entornos

Cómo se arma cada entorno y cómo se enlaza con el repositorio. El porqué está
en [Arquitectura §7](arquitectura.md#7-despliegue-y-entornos).

| Entorno | Base | Web | Móvil | Estado |
|---|---|---|---|---|
| Local | `npx supabase start` (Docker) | `npx expo start --web` | Expo Go o development build | Listo |
| Staging | Proyecto Supabase propio | Por decidir (ADR-007) | Canal EAS `preview` | Falta crear el proyecto |
| Producción | Proyecto Supabase propio, `sa-east-1` | Por decidir (ADR-007) | Canal EAS `production` | Sprint 3 |

## Reglas que valen para todos

- **El esquema solo cambia por migraciones** (`supabase/migrations/`). Nada a
  mano en el panel: lo que se cambia ahí no está en el repositorio y la
  próxima `db push` no lo conoce.
- **Al cliente solo van la URL y la clave pública** (`anon` o
  *publishable*). Todo lo que empieza con `EXPO_PUBLIC_` se hornea en el
  paquete que se descarga, así que una clave privada ahí es una clave
  publicada. `npm run claves:check` lo revisa, y el CI también.
- **La clave de servicio** (`service_role` o `sb_secret_…`) vive solo en los
  secretos de GitHub y de las Edge Functions.
- **La semilla es solo local.** Staging lleva datos de prueba creados a mano
  desde la app; nunca una copia de producción.

## Local

Está en el [README](../README.md#correr-el-proyecto). En resumen:
`npx supabase start`, copiar la URL y la clave `anon` que imprime a
`.env.local`, y `npx supabase db reset` cuando haga falta volver a cero. La
semilla deja dos administradoras ficticias y cuatro cuentas.

Los correos que manda Auth (recuperar la contraseña, por ejemplo) no salen a
internet: se ven en Mailpit, en http://127.0.0.1:54324.

## Staging

### Crear el proyecto (una vez)

1. En https://supabase.com/dashboard, proyecto nuevo en la organización del
   equipo, región `sa-east-1`. Guardar la contraseña de la base en el gestor
   de contraseñas del equipo.
2. Anotar el *project ref* (lo que va antes de `.supabase.co`).
3. En **Authentication → URL Configuration**:
   - *Site URL*: la dirección de la web de staging.
   - *Redirect URLs*: la web de staging con `/**`, y
     `proyectoinmobiliaria://**` para el teléfono. Sin esto, el enlace del
     correo de recuperación vuelve al *Site URL* y no a la app.
4. En **Authentication → Emails → SMTP**, el proveedor de correo del equipo.
   El correo de Supabase por defecto manda muy pocos mensajes por hora y no
   sirve más allá de una prueba.

### Enlazar el repositorio

En GitHub, **Settings → Environments → New environment** `staging`, y en él:

| Tipo | Nombre | Valor |
|---|---|---|
| Secreto | `SUPABASE_ACCESS_TOKEN` | Un token de https://supabase.com/dashboard/account/tokens |
| Secreto | `SUPABASE_DB_PASSWORD` | La contraseña de la base |
| Variable | `SUPABASE_PROJECT_REF` | El *project ref* |

Con eso, cada vez que el CI de `main` termina en verde, el workflow
[`staging.yml`](../.github/workflows/staging.yml) aplica las migraciones
nuevas (`supabase db push`). Mientras falten, el workflow deja un aviso y no
hace nada. También se puede correr a mano desde **Actions → Staging → Run
workflow**.

Para mirar staging desde una máquina:

```bash
npx supabase link --project-ref <ref>     # pide la contraseña de la base
npx supabase migration list               # qué migraciones tiene staging
```

`supabase link` guarda el enlace en `supabase/.temp/`, que no se versiona.

### Construir la app contra staging

```bash
# .env.staging.local (no se versiona)
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<la clave anon o publishable del proyecto>
```

Las `EXPO_PUBLIC_*` se fijan al construir: una web o un binario hechos para
local no hablan con staging. En EAS van como variables del entorno
`preview`.

## Producción

Se crea en el Sprint 3, igual que staging, con su propio environment
`production` en GitHub y aprobación manual (Arquitectura §7.1).
