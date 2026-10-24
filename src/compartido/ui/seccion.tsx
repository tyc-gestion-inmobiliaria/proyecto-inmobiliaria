/**
 * Las piezas de las secciones del menú que trabajan sobre un edificio.
 *
 * - `ConEdificio`: si hay un edificio elegido arriba, muestra la sección de
 *   ese edificio; si se trabaja con toda la cartera, pide elegir uno con una
 *   fila por edificio, y elegirlo cambia también el selector de arriba.
 * - `SeccionEnDiseno`: lo que se ve en la maqueta en una sección que todavía
 *   no tiene pantalla. Dice qué va a resolver, para diseñarla sobre eso.
 */
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useContextoDeTrabajo } from "@/compartido/contexto/proveedor-contexto";
import { EmptyState, Icon, ScreenTitle, resolveInteraction, textStyle, useStyles, useTheme, type EstadoPresionable, type Tema } from "@/ui";
import type { IconName } from "@/ui/components/icon-paths";

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
        <View style={s.lista}>
          <Text style={[textStyle(t, "label", t.color.text.secondary), s.cabeza]}>Elige un edificio</Text>
          {edificios.map((e) => (
            <Pressable
              key={e.id}
              accessibilityRole="button"
              onPress={() => elegirEdificio(e.id)}
              style={(estado: EstadoPresionable) => {
                const i = resolveInteraction(estado);
                return [s.fila, i === "hovered" && s.filaEncima, i === "pressed" && s.filaPresionada];
              }}
            >
              <View style={s.iconoFila} aria-hidden>
                <Icon name="building" size="sm" color={t.color.accent.text} />
              </View>
              <Text style={[textStyle(t, "body"), s.nombre]}>{e.nombre}</Text>
              <Icon name="chevron-right" size="sm" color={t.color.text.secondary} />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export function SeccionEnDiseno({ titulo, icono, resuelve }: { titulo: string; icono: IconName; resuelve: string }) {
  const s = useStyles(makeStyles);
  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <ScreenTitle>{titulo}</ScreenTitle>
      <EmptyState icon={icono} title="Sección en diseño" description={resuelve} />
    </ScrollView>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.xl, padding: t.space.xl, maxWidth: 1080, width: "100%" },
    lista: {
      overflow: "hidden",
      maxWidth: 560,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: t.radius.md,
      backgroundColor: t.color.bg.surface,
    },
    cabeza: { paddingHorizontal: t.space.lg, paddingTop: t.space.lg, paddingBottom: t.space.sm },
    fila: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.md,
      paddingHorizontal: t.space.lg,
      borderTopWidth: 1,
      borderTopColor: t.color.border.subtle,
      cursor: "pointer",
    },
    filaEncima: { backgroundColor: t.color.bg.hover },
    filaPresionada: { backgroundColor: t.color.bg.pressed },
    iconoFila: {
      width: 32,
      height: 32,
      borderRadius: t.radius.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.color.accent.subtle,
    },
    nombre: { flex: 1 },
  });
