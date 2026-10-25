/**
 * Las piezas de las secciones del menú que trabajan sobre un edificio.
 *
 * - `ConEdificio`: si hay un edificio elegido arriba, muestra la sección de
 *   ese edificio; si se trabaja con toda la cartera, pide elegir uno. Cada
 *   edificio es una tarjeta con su foto de portada (genérica por ahora), para
 *   reconocerlo de un vistazo, como en Inicio y en Edificios; elegirlo cambia
 *   también el selector de arriba.
 */
import type { ReactNode } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { useContextoDeTrabajo } from "@/compartido/contexto/proveedor-contexto";
import { Card, EmptyState, Icon, ScreenTitle, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import { fotoDeEdificio } from "./foto-de-edificio";

export function ConEdificio({ titulo, children }: { titulo: string; children: (edificioId: string) => ReactNode }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { edificio, edificios, elegirEdificio } = useContextoDeTrabajo();
  if (edificio) return <>{children(edificio.id)}</>;

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <ScreenTitle>{titulo}</ScreenTitle>
      {edificios.length === 0 ? (
        <EmptyState icon="building" title="Todavía no hay edificios" description="Registra uno en Edificios para empezar." />
      ) : (
        <>
          <Text style={textStyle(t, "body", t.color.text.secondary)}>¿En qué edificio vas a trabajar?</Text>
          <View style={s.rejilla}>
            {edificios.map((e) => (
              <Card
                key={e.id}
                padding="md"
                style={s.tarjeta}
                onPress={() => elegirEdificio(e.id)}
                accessibilityLabel={`Trabajar en ${e.nombre}`}
                testID={`elegir-edificio-${e.id}`}
              >
                <Image source={fotoDeEdificio(e.id)} style={s.foto} resizeMode="cover" accessibilityIgnoresInvertColors aria-hidden />
                <View style={s.pie}>
                  <Text style={[textStyle(t, "subtitle"), s.nombre]} numberOfLines={2}>
                    {e.nombre}
                  </Text>
                  <Icon name="chevron-right" size="sm" color={t.color.accent.text} />
                </View>
              </Card>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: 1080, width: "100%" },
    rejilla: { flexDirection: "row", flexWrap: "wrap", gap: t.space.md },
    tarjeta: { flexGrow: 1, flexShrink: 1, flexBasis: 220, maxWidth: 340, gap: t.space.md },
    foto: { width: "100%", height: 120, borderRadius: t.radius.sm },
    pie: { flexDirection: "row", alignItems: "center", gap: t.space.sm, paddingHorizontal: t.space.xs },
    nombre: { flex: 1 },
  });
