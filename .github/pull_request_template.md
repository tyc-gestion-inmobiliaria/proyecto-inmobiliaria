<!-- Título con el formato de un commit: tipo(scope): descripción en primera persona. -->

## Qué cambia y por qué

Historia: #

## Cómo se prueba

<!-- Pasos, o qué pruebas nuevas cubren el cambio. -->

## Capturas

<!-- Si cambia algo que se ve: web y, si aplica, teléfono. Sin datos personales reales. -->

## Migraciones

<!-- Si hay: qué hacen y si son reversibles. Si no, "No hay". -->

## Riesgos

<!-- Qué podría romperse. -->

## Definición de Hecho

- [ ] Cumple todos los criterios de aceptación de la historia.
- [ ] El CI está en verde (tipos, lint, pruebas unitarias, pgTAP y build de la web).
- [ ] Tiene pruebas: unitarias del dominio; pgTAP si toca la base.
- [ ] Toda tabla nueva tiene `org_id`, RLS por administradora y su prueba de aislamiento en `supabase/tests/`.
- [ ] Los cambios de esquema entran como migración y aplican sobre una base vacía (`supabase db reset`).
- [ ] El dinero se calcula en el servidor, no en el cliente.
- [ ] Lo que se ve usa el kit: un solo primario por vista, errores junto al campo, estados con texto y no solo con color, contraste 4.5:1, texto base 14 px, área táctil de 44×44.
- [ ] Sin textos de proceso ni datos de relleno en pantalla.
- [ ] Sin datos personales reales en código, semillas, capturas ni en este PR.
- [ ] Si cambió una regla, una decisión o una pregunta abierta, quedó anotado en la wiki del proyecto.
