---
name: ddd-modulos
description: Reglas de diseño guiado por el dominio (DDD) de proyecto-inmobiliaria — qué contexto acotado es dueño de cada concepto, qué módulo puede importar a cuál, dónde va un agregado, una regla, un puerto o un adaptador, y cómo se comunican dos módulos sin acoplarse. Usar antes de crear un módulo, una tabla, un caso de uso o una pantalla, al mover código entre módulos, o cuando no esté claro "de quién es" un concepto (pago, lectura, invitación, recibo, aviso).
---

# DDD en proyecto-inmobiliaria

El código se divide por **contextos acotados**, no por capas técnicas. Cada
contexto es un módulo en `src/modulos/<modulo>/` y, en la base, un grupo de
tablas y funciones con su migración. Lo que manda está en `AGENTS.md` y en
`docs/arquitectura.md`; esta skill es la parte de diseño: de quién es cada
cosa y por dónde se habla.

## 1. El mapa de contextos

| Módulo | Contexto | Agregados (raíz → partes) | Lenguaje propio |
|---|---|---|---|
| `organizaciones` | Identidad y acceso | Organización → Membresía; Invitación | administradora, rol, invitar, aceptar |
| `padron` | Padrón del edificio | Edificio → Unidad → Vínculo; Persona; CuentaBancaria | unidad, participación, responsable de pago |
| `cobranza` | Cierre mensual y recibos | Cierre → Lectura, Partida; Recibo | periodo, lectura, partida, emitir |
| `pagos` | Pagos y su aplicación | Pago → Aplicación (a recibos) | reportar, registrar, validar, rechazar, revertir |
| `residente` | Portal del residente | — (solo lectura y acciones de otros contextos) | mi unidad, lo que debo |
| `campo` | Trabajo del personal en el edificio | — (usa los casos de uso de lecturas de `cobranza`) | recorrido, pendiente, n de total |
| `notificaciones` | Avisos por correo | Envío (bandeja de salida) | enviar, reintentar, sin enviar |
| `auditoria` | Trazabilidad financiera | RegistroDeAuditoria (solo se agrega) | quién, cuándo, antes, después |
| `cartera` | Inicio de la administradora | — (modelo de lectura) | estado del edificio, siguiente paso |

Relaciones (aguas arriba → aguas abajo):

```
organizaciones ─▶ todos           (la membresía decide qué se ve)
padron ─▶ cobranza ─▶ pagos       (unidad → recibo → pago aplicado)
cobranza, pagos ─▶ notificaciones (eventos: recibo emitido, pago validado/rechazado)
cobranza, pagos ─▶ auditoria      (cada cambio de dinero deja un registro)
padron, cobranza, pagos ─▶ cartera, residente   (modelos de lectura)
cobranza ─▶ campo                 (el personal carga lecturas del cierre)
```

Si un concepto no está en la tabla, **antes de escribirlo decide su dueño**.
Un concepto tiene un solo dueño: "pago" es de `pagos` aunque se vea en la
ficha de la unidad (`padron`) y en el portal del residente.

## 2. Capas dentro de un módulo

```
dominio/          entidades, objetos de valor y reglas puras. Sin React, sin Supabase.
aplicacion/       casos de uso (una función por intención) y puertos (interfaces)
infraestructura/  adaptadores: <x>-supabase.ts y <x>-falso.ts para pruebas
ui/               pantallas y componentes; hablan con casos de uso y puertos
```

- `dominio` no importa nada de fuera de su carpeta (ni de `aplicacion`).
- Un caso de uso recibe sus puertos por parámetro; nunca crea un cliente de
  Supabase.
- El adaptador de Supabase se elige en la pantalla o la ruta, no dentro del
  caso de uso.
- Cada regla pura lleva su `*.test.ts` al lado.
- Los objetos de valor (dinero en céntimos, periodo `AAAA-MM`, estado de un
  pago) se validan al crearse y no se pasan como `string` o `number` sueltos
  por la aplicación.

## 3. Qué puede importar un módulo de otro

Permitido:

- `@/modulos/<otro>/aplicacion/puertos` — solo **tipos** (`import type`).
- `@/modulos/<otro>/dominio/...` — funciones puras de un contexto **aguas
  arriba** (por ejemplo, `cartera` usa `ordenarEdificios` de `padron`).
- `@/modulos/<otro>/aplicacion/<caso>` — un caso de uso de un contexto aguas
  arriba cuando el de abajo lo **orquesta** (`campo` llama al guardado de
  lecturas de `cobranza`).
- `@/modulos/organizaciones/ui/con-organizacion` — es el marco de sesión de
  toda pantalla.
- En pruebas, el adaptador falso de otro módulo.

Prohibido:

- Importar la `infraestructura` (no falsa) o la `ui` de otro módulo, salvo
  `con-organizacion`.
- Ciclos: si `pagos` importa de `cobranza`, `cobranza` no importa de
  `pagos`. Cuando la ficha (de `padron`) necesita mostrar pagos, **la ruta
  compone** las dos piezas (`src/app/...` importa de ambos), como ya hace la
  ficha con el estado de cuenta.
- Escribir en las tablas de otro contexto desde un adaptador. Si `pagos`
  necesita marcar un recibo como pagado, lo hace una función de Postgres de
  `pagos` en la misma transacción, no un `update recibo` desde el cliente.
- Lo compartido por varios módulos que no es de ninguno va en
  `src/compartido/` (carga, piezas de pantalla, cliente de Supabase).

## 4. La base también se divide por contexto

- Una migración por cambio de un contexto, con el nombre del módulo:
  `<fecha>_pagos_reportar_y_validar.sql`.
- Las invariantes del agregado viven en la base (restricciones, `check`,
  funciones `security definer` en `private` con `set search_path = ''`) y se
  repiten en `dominio` para avisar antes de llamar. **La base es la que
  manda**; el dominio del cliente solo adelanta el aviso.
- Una transición de estado (aceptar un pago, emitir un cierre, aceptar una
  invitación) es **una función** que valida el rol, la pertenencia y el
  estado anterior, y es idempotente ante el doble clic o el reintento.
- Comunicación entre contextos en la base: por **eventos en tablas** que el
  de abajo lee (por ejemplo, `notificaciones` lee la bandeja `envio` que
  llenan las funciones de `cobranza` y `pagos`), nunca porque un contexto
  conozca las columnas internas de otro.
- Toda tabla nueva: `org_id`, RLS por operación, clave foránea compuesta,
  y sus pruebas en `supabase/tests/01_rls_activada.sql` y
  `02_aislamiento.sql` (ver `AGENTS.md`).

## 5. Lenguaje ubicuo

Se escribe igual en la tabla, el tipo, la función y la pantalla. Del
glosario (`docs/arquitectura.md` §12): **unidad** (no "bloque
inmobiliario"), **fondo** (no "bolsa"), **pago** (no "voucher"). Estados en
palabras que lee la persona: `por_validar` → "Por validar", `aceptado` →
"Validado", `rechazado` → "Rechazado". Si un término nuevo aparece, se suma
al glosario en el mismo PR.

## 6. Lista para revisar un cambio

1. ¿El concepto nuevo tiene dueño en el mapa? ¿Está en ese módulo?
2. ¿`dominio` sigue sin importar nada de fuera?
3. ¿Ningún import cruza a `infraestructura` o `ui` ajena?
4. ¿Hay un ciclo nuevo entre módulos?
5. ¿La regla de dinero o de estado vive en Postgres y tiene prueba pgTAP?
6. ¿Los nombres siguen el glosario?
7. ¿El scope del commit es el módulo (`feat(pagos): ...`)?
