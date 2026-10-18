/**
 * Un tablero por columnas: lo que está en cada etapa de algo, de izquierda a
 * derecha. Tareas por estado, pedidos por paso, candidatos por entrevista.
 *
 * - **Las columnas reparten el ancho** cuando caben y, cuando no, el tablero
 *   se desliza de costado. En un teléfono se ve una columna y el borde de la
 *   siguiente, que es lo que avisa que hay más.
 * - **No se arrastra.** Arrastrar no se puede hacer con teclado ni con lector
 *   de pantalla, y con el dedo choca con el desliz del tablero. Mover una
 *   tarjeta de columna es cosa de la pantalla: un botón, un menú o el diálogo
 *   que la edita.
 * - El número de la columna va siempre, también en cero: una columna vacía
 *   dice "0", no se queda callada.
 */
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable, type ForcedInteraction } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";

export function Board({ children, accessibilityLabel }: { children: ReactNode; accessibilityLabel?: string }) {
  const s = useStyles(makeStyles);
  return (
    <ScrollView
      horizontal
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={s.board}
      showsHorizontalScrollIndicator
    >
      {children}
    </ScrollView>
  );
}

export interface BoardColumnProps {
  title: string;
  count: number;
  children?: ReactNode;
  /** Lo que se dice cuando no hay tarjetas. Va en vez del hueco. */
  emptyText?: string;
  /** Lo de la cabecera a la derecha: un botón de agregar, un menú. */
  action?: ReactNode;
}

export function BoardColumn({ title, count, children, emptyText = "Nada por acá.", action }: BoardColumnProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const empty = count === 0;
  return (
    <View style={s.column} accessibilityLabel={`${title}: ${count}`}>
      <View style={s.head}>
        <Text accessibilityRole="header" style={[textStyle(t, "subtitle"), s.title]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[textStyle(t, "data", t.color.text.secondary), s.count]}>{count}</Text>
        <View style={s.spacer} />
        {action}
      </View>
      <View style={s.cards}>
        {empty ? <Text style={[textStyle(t, "bodySmall", t.color.text.secondary), s.empty]}>{emptyText}</Text> : children}
      </View>
    </View>
  );
}

export interface BoardCardProps {
  children: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  /** Lo que se oye al llegar a la tarjeta: su título, no todo lo que lleva. */
  accessibilityLabel: string;
  /** Solo para vitrina, Storybook y Figma. */
  forcedState?: ForcedInteraction;
}

/**
 * Una tarjeta del tablero. Si se toca, dice sus cuatro estados; lo elegido
 * lleva un borde más grueso además del color.
 *
 * Una tarjeta que se toca no lleva otro control adentro (una casilla, un
 * botón): un botón dentro de otro no se puede alcanzar bien con teclado ni
 * con lector de pantalla. Lo que se cambia, se cambia en lo que abre.
 */
export function BoardCard({ children, onPress, selected = false, accessibilityLabel, forcedState }: BoardCardProps) {
  const s = useStyles(makeStyles);
  if (!onPress) {
    return (
      <View style={s.card} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={(state: EstadoPresionable) => {
        const i = resolveInteraction(state, { selected, forced: forcedState });
        return [
          s.card,
          s.cardPressable,
          i === "hovered" && s.cardHovered,
          i === "pressed" && s.cardPressed,
          i === "selected" && s.cardSelected,
        ];
      }}
    >
      {children}
    </Pressable>
  );
}

const COLUMN_MIN = 272;

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    board: { flexGrow: 1, gap: t.space.lg, paddingBottom: t.space.sm, alignItems: "flex-start" },
    column: {
      flexGrow: 1,
      flexBasis: COLUMN_MIN,
      minWidth: COLUMN_MIN,
      maxWidth: 420,
      gap: t.space.md,
      padding: t.space.md,
      borderRadius: t.radius.md,
      backgroundColor: t.color.bg.muted,
    },
    head: { flexDirection: "row", alignItems: "center", gap: t.space.sm, minHeight: t.control.sm },
    title: { flexShrink: 1 },
    count: { fontWeight: "600" },
    spacer: { flex: 1 },
    cards: { gap: t.space.sm },
    empty: { paddingVertical: t.space.lg, textAlign: "center" },
    card: {
      gap: t.space.sm,
      padding: t.space.md,
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.bg.surface,
    },
    cardPressable: { cursor: "pointer" },
    cardHovered: { borderColor: t.color.border.focus, backgroundColor: t.color.bg.hover },
    cardPressed: { borderColor: t.color.border.focus, backgroundColor: t.color.bg.pressed },
    // El borde de 2 se come 1 de relleno, para que la tarjeta no salte al elegirla.
    cardSelected: {
      borderColor: t.color.accent.base,
      borderWidth: 2,
      padding: t.space.md - 1,
      backgroundColor: t.color.accent.subtle,
    },
  });
