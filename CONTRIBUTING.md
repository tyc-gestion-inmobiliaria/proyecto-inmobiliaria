# Cómo contribuir

La versión completa está en [`docs/guia-de-trabajo.md`](docs/guia-de-trabajo.md).
Acá va lo que se necesita para abrir el primer PR.

## Flujo de Git
- **`main` se trata como protegida.** Todo entra por pull request, con al menos una
- **`main` está protegida.** Todo entra por pull request, con al menos una
  aprobación de alguien distinto del autor y el CI en verde. Se fusiona con GitHub todavía no lo impide: proteger ramas en un repo privado pide el plan Team de la organización.
  *squash*: un commit por PR, con el título del PR como mensaje.
- **Una rama por historia**, con el número del tablero:

  | Rama | Para qué |
  |---|---|
  | `feat/<id>-<descripcion>` | Una historia nueva: `feat/42-cierre-paso-3` |
  | `fix/<id>-<descripcion>` | Un defecto |
  | `docs/…`, `chore/…`, `refactor/…`, `test/…`, `ci/…` | Lo que no es funcionalidad ni defecto |
  | `hotfix/<descripcion>` | Arreglo urgente en producción, con acuerdo del líder técnico |

- La rama vive poco: menos de tres días. Si no alcanza, la historia se parte.
- Antes de pedir revisión: `git rebase main` en la rama propia. Nunca sobre la
  rama de otro, y nunca `push --force` a `main`; en la propia,
  `--force-with-lease`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/es/), en español:

```
tipo(scope): descripción en primera persona, en presente, sin punto final
```

- **Tipo:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`, `perf`, `ci`.
- **Scope, siempre:** el módulo o el área — `organizaciones`, `padron`,
  `cobranza`, `cartera`, `auditoria`, `kit`, `db`, `ci`, `docs`, `repo`. Si un
  commit no tiene un scope claro, toca dos cosas y hay que partirlo.
- **Sin `/` en el título**: termina en nombres de rama y de archivo.
- Cuerpo opcional: el porqué, no el qué.
- Un cambio que rompe compatibilidad lleva `!` después del scope y un pie
  `BREAKING CHANGE:`.
- El commit lo firma quien lo escribe, con su `git config`. **Sin líneas de
  atribución a herramientas** (`Co-Authored-By` de un asistente, "Generated
  with…") en commits, PRs ni archivos.

```
feat(cobranza): agrego la vista previa de recibos del paso 3
fix(padron): corrijo la suma de participaciones con unidades sin metraje
test(db): agrego la prueba de aislamiento de la tabla pago
```

## Pull requests

Título con el formato de un commit. La plantilla pide qué cambia y por qué
(con el enlace a la historia), cómo se prueba, capturas si cambia algo que se
ve, migraciones y riesgos. Apuntar a menos de 400 líneas cambiadas, sin contar
migraciones generadas ni el archivo de bloqueo.

Quien revisa mira, en este orden: que haga lo que dice la historia; que no
abra una fuga entre administradoras; que el dinero se calcule en el servidor;
que lo que se ve cumpla las reglas de accesibilidad; que tenga pruebas; el
estilo al final. Se responde en menos de un día hábil.

## Antes de pedir revisión

```bash
npx tsc --noEmit
npm run lint
npm test
npm run tokens:check
npx expo export --platform web
npx supabase test db        # si tocaste supabase/
```

## Definición de Listo

Una historia entra al sprint cuando:

- [ ] Está escrita como historia: quién, qué, para qué.
- [ ] Tiene criterios de aceptación verificables (Dado / Cuando / Entonces).
- [ ] Las reglas de negocio que necesita están respondidas por el cliente, o
      la historia dice explícitamente qué supuesto usa.
- [ ] Si tiene pantalla, el wireframe o diseño está aprobado.
- [ ] Si toca la base, se sabe qué tablas cambian.
- [ ] Está estimada y cabe en un sprint (8 puntos o menos).
- [ ] No tiene dependencias bloqueantes abiertas.

## Definición de Hecho

Una historia se cierra cuando:

- [ ] Cumple todos sus criterios de aceptación.
- [ ] Está fusionada en `main` por PR aprobado, con el CI en verde.
- [ ] Tiene pruebas: unitarias del dominio; pgTAP si toca la base, **incluida
      la de aislamiento entre administradoras para cada tabla nueva**; punta a
      punta si cambia un flujo clave.
- [ ] Las migraciones aplican sobre una base vacía (`supabase db reset`) y
      sobre staging.
- [ ] Lo que se ve cumple las reglas de accesibilidad: contraste 4.5:1, texto
      base 14 px, estados con texto y no solo con color, un solo botón
      primario por vista, área táctil de 44×44.
- [ ] Funciona en staging y lo revisó el responsable de producto.
- [ ] Si cambió una regla, una decisión o una pregunta abierta, quedó anotado
      en la wiki del proyecto.
- [ ] Sin datos personales reales en código, semillas, capturas ni PR.

## Una tabla nueva

1. `npx supabase migration new <nombre>` y el SQL en ese archivo.
2. `org_id uuid not null`, también en las tablas hijas; claves foráneas
   compuestas con `org_id`.
3. RLS activada y políticas por operación con `private.mis_orgs()` y
   `private.tiene_rol()`.
4. La tabla en la lista de `supabase/tests/01_rls_activada.sql` y su caso en
   `supabase/tests/02_aislamiento.sql`. Sin eso el CI falla.
