/**
 * Las piezas de las secciones del menú que trabajan sobre un edificio.
 *
 * - `ConEdificio`: si hay un edificio elegido arriba, muestra la sección de
 *   ese edificio; si se trabaja con toda la cartera, pide elegir uno. Cada
 *   edificio es una tarjeta con su foto de portada (genérica por ahora), para
 *   reconocerlo de un vistazo, como en Inicio y en Edificios; elegirlo cambia
 *   también el selector de arriba.
 * - Con un solo edificio no se pregunta: es ese.
 * - En el teléfono cada edificio es una fila con su miniatura: una foto a
 *   todo el ancho por edificio obliga a desplazarse para ver el tercero.
 */
import type { ReactNode } from "react";
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useContextoDeTrabajo } from "@/shared/context/context-provider";
import { ANCHO_DE_PANTALLA } from "@/shared/ui/layout";
import { Card, CardGrid, EmptyState, Icon, ScreenTitle, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import { fotoDeEdificio } from "./building-photo";

const ANCHO_ANGOSTO = 600;

export function ConEdificio({ titulo, children }: { titulo: string; children: (edificioId: string) => ReactNode }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { edificio, edificios, elegirEdificio } = useContextoDeTrabajo();
  const angosto = useWindowDimensions().width < ANCHO_ANGOSTO;
  if (edificio) return <>{children(edificio.id)}</>;
  if (edificios.length === 1) return <>{children(edificios[0].id)}</>;

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <ScreenTitle>{titulo}</ScreenTitle>
      {edificios.length === 0 ? (
        <EmptyState icon="building" title="Todavía no hay edificios" description="Registra uno en Edificios para empezar." />
      ) : (
        <>
          <Text style={textStyle(t, "body", t.color.text.secondary)}>Elige un edificio.</Text>
          <CardGrid minItemWidth={240} maxColumns={4}>
            {edificios.map((e) => (
              <Card
                key={e.id}
                padding="md"
                style={angosto ? [s.tarjeta, s.fila] : s.tarjeta}
                onPress={() => elegirEdificio(e.id)}
                accessibilityLabel={`Trabajar en ${e.nombre}`}
                testID={`elegir-edificio-${e.id}`}
              >
                <Image
                  source={fotoDeEdificio(e.id)}
                  style={angosto ? s.miniatura : s.foto}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                  aria-hidden
                />
                <View style={angosto ? [s.pie, s.pieEnFila] : s.pie}>
                  <Text style={[textStyle(t, "subtitle"), s.nombre]} numberOfLines={2}>
                    {e.nombre}
                  </Text>
                  <Icon name="chevron-right" size="sm" color={t.color.accent.text} />
                </View>
              </Card>
            ))}
          </CardGrid>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: ANCHO_DE_PANTALLA, width: "100%" },
    tarjeta: { flexGrow: 1, gap: t.space.md },
    // El fondo apagado reserva el lugar mientras la foto carga: sin él, la tarjeta se ve vacía un instante.
    foto: { width: "100%", height: 120, borderRadius: t.radius.sm, backgroundColor: t.color.bg.muted },
    fila: { flexDirection: "row", alignItems: "center" },
    miniatura: { width: 56, height: 56, borderRadius: t.radius.sm, backgroundColor: t.color.bg.muted },
    pieEnFila: { flex: 1, minWidth: 0 },
    pie: { flexDirection: "row", alignItems: "center", gap: t.space.sm, paddingHorizontal: t.space.xs },
    nombre: { flex: 1 },
  });
