/**
 * Una tabla de datos hecha de filas flexibles.
 *
 * - **Por debajo de `minWidth` no se aprieta: se desplaza a lo ancho.** Con
 *   columnas repartidas por `flex`, una ventana angosta las monta unas sobre
 *   otras. La barra de desplazamiento queda visible porque en un teléfono no
 *   hay puntero que la descubra.
 * - **La cabecera se alinea igual que sus celdas.** Una columna de cifras
 *   alineada a la derecha con el rótulo a la izquierda deja el rótulo sobre la
 *   columna de al lado.
 * - **Una fila que se abre avisa antes de abrirse** (encima), confirma el
 *   toque (presionada) y puede quedar marcada (elegida, con barra a la
 *   izquierda además del fondo).
 * - **Una tabla larga se pinta por tandas** (`usePagedRows` + `TableMore`),
 *   y el pie dice cuántas se ven de cuántas: un recorte que no se nota hace
 *   creer que la lista termina ahí.
 */
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { resolveInteraction, type EstadoPresionable, type ForcedInteraction } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { Button } from "./button";
import type { SortDirection } from "./stage-logic";
import { TouchArea } from "./touch-area";

export function DataTable({ children, minWidth = 640 }: { children: ReactNode; minWidth?: number }) {
  const s = useStyles(makeStyles);
  // Sin ancho mínimo no hay nada que desplazar: las filas toman el ancho de la tabla y se acomodan.
  if (minWidth === 0) return <View style={s.table}>{children}</View>;
  return (
    <View style={s.table}>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={s.grow}>
        <View style={[s.grow, { minWidth }]}>{children}</View>
      </ScrollView>
    </View>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  const s = useStyles(makeStyles);
  return <View style={s.head}>{children}</View>;
}

export interface TableRowProps {
  children: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  accessibilityLabel?: string;
  /** Solo para vitrina, Storybook y Figma. */
  forcedState?: ForcedInteraction;
}

export function TableRow({ children, onPress, selected = false, accessibilityLabel, forcedState }: TableRowProps) {
  const s = useStyles(makeStyles);
  if (!onPress) return <View style={[s.row, selected && s.rowSelected]}>{children}</View>;
  return (
    <Pressable
      // Una fila que abre algo es un enlace; como botón, en la web no podría llevar botones adentro.
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={(state: EstadoPresionable) => {
        const i = resolveInteraction(state, { selected, forced: forcedState });
        return [
          s.row,
          s.rowPressable,
          i === "hovered" && s.rowHovered,
          i === "pressed" && s.rowPressed,
          i === "selected" && s.rowSelected,
        ];
      }}
    >
      {children}
    </Pressable>
  );
}

/**
 * Una cabecera de columna. `flex` reparte el ancho igual que en sus celdas.
 *
 * Con `onSort` se vuelve el botón que ordena por esa columna. El orden puesto
 * se ve con la flecha (▲ de menor a mayor, ▼ de mayor a menor) **y** con la
 * letra en color de texto principal; la que no ordena muestra ↕ apagada, para
 * que se sepa que se puede tocar sin tener que pasar el ratón. El ciclo es
 * ascendente → descendente → sin orden (`nextSort`).
 */
export function Th({
  children,
  flex = 1,
  align,
  style,
  sort,
  onSort,
}: {
  children: string;
  flex?: number;
  align?: "right";
  style?: StyleProp<TextStyle>;
  /** El orden puesto en esta columna, o `null` si ordena otra. */
  sort?: SortDirection | null;
  onSort?: () => void;
}) {
  const t = useTheme();
  if (!onSort) {
    return (
      <Text style={[textStyle(t, "label", t.color.text.secondary), { flex }, align === "right" && styles.right, style]}>
        {children}
      </Text>
    );
  }
  const puesto = Boolean(sort);
  const flecha = sort === "asc" ? "▲" : sort === "desc" ? "▼" : "↕";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ordenar por ${children}${sort === "asc" ? ", de menor a mayor" : sort === "desc" ? ", de mayor a menor" : ""}`}
      accessibilityState={{ selected: puesto }}
      onPress={onSort}
      style={(estado: EstadoPresionable) => {
        const i = resolveInteraction(estado, { selected: puesto });
        return [
          styles.ordenable,
          { flex, justifyContent: align === "right" ? "flex-end" : "flex-start" },
          i === "hovered" && { backgroundColor: t.color.bg.hover },
          i === "pressed" && { backgroundColor: t.color.bg.pressed },
        ];
      }}
    >
      <Text style={[textStyle(t, "label", puesto ? t.color.text.primary : t.color.text.secondary), style]}>{children}</Text>
      <Text style={textStyle(t, "label", puesto ? t.color.text.primary : t.color.text.tertiary)}>{flecha}</Text>
      <TouchArea height={32} border={0} />
    </Pressable>
  );
}

export function Td({
  children,
  flex = 1,
  mono,
  align,
  muted,
  strikethrough,
  style,
}: {
  children: ReactNode;
  flex?: number;
  /** Para cifras: números tabulares, así las columnas de números alinean. */
  mono?: boolean;
  align?: "right";
  muted?: boolean;
  /** Lo anulado: tachado y apagado, no borrado. */
  strikethrough?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  return (
    <Text
      style={[
        textStyle(t, mono ? "data" : "bodySmall", muted ? t.color.text.secondary : t.color.text.primary),
        { flex },
        align === "right" && styles.right,
        strikethrough && { textDecorationLine: "line-through", color: t.color.text.tertiary },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Una celda que aloja otra cosa que texto (un `Badge`, un `Meter`). */
export function TdView({ children, flex = 1, style }: { children: ReactNode; flex?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flex }, style]}>{children}</View>;
}

export function TableEmpty({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={[textStyle(t, "body", t.color.text.secondary), { padding: t.space.xl }]}>{children}</Text>;
}

export const ROWS_PER_PAGE = 100;

/**
 * Las primeras filas de `rows` y cómo pedir otra tanda. Vuelve a la primera
 * cuando cambia la lista (otro filtro), así que `rows` tiene que venir
 * memoizada.
 */
export function usePagedRows<T>(rows: T[], step = ROWS_PER_PAGE) {
  const [st, setSt] = useState({ of: rows, limit: step });
  const limit = st.of === rows ? st.limit : step;
  return {
    visible: rows.length > limit ? rows.slice(0, limit) : rows,
    total: rows.length,
    step,
    showMore: () => setSt({ of: rows, limit: limit + step }),
  };
}

export function TableMore({
  visible,
  total,
  step,
  onMore,
  format = (n) => n.toLocaleString(),
  texts = {
    summary: (v, t) => `Se ven ${v} de ${t}.`,
    more: (n) => `Ver ${n} más`,
  },
}: {
  visible: number;
  total: number;
  step: number;
  onMore: () => void;
  format?: (n: number) => string;
  texts?: { summary: (visible: string, total: string) => string; more: (next: string) => string };
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  if (visible >= total) return null;
  const next = Math.min(step, total - visible);
  return (
    <View style={s.more}>
      <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{texts.summary(format(visible), format(total))}</Text>
      <Button size="sm" variant="secondary" label={texts.more(format(next))} onPress={onMore} />
    </View>
  );
}

const styles = StyleSheet.create({
  ordenable: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32, marginVertical: -6, paddingHorizontal: 4, marginHorizontal: -4, borderRadius: 4, cursor: "pointer" }, right: { textAlign: "right" } });

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    table: {
      backgroundColor: t.color.bg.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: t.radius.md,
      overflow: "hidden",
    },
    grow: { flexGrow: 1 },
    head: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.md,
      paddingHorizontal: t.space.lg,
      paddingVertical: t.space.md,
      backgroundColor: t.color.bg.muted,
      borderBottomWidth: 1,
      borderBottomColor: t.color.border.default,
      // El mismo borde que la fila, para que las columnas caigan en el mismo sitio.
      borderLeftWidth: 3,
      borderLeftColor: "transparent",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.md,
      minHeight: t.control.md + 4,
      paddingHorizontal: t.space.lg,
      paddingVertical: t.space.sm,
      borderBottomWidth: 1,
      borderBottomColor: t.color.border.subtle,
      borderLeftWidth: 3,
      borderLeftColor: "transparent",
    },
    rowPressable: { cursor: "pointer" },
    rowHovered: { backgroundColor: t.color.bg.hover },
    rowPressed: { backgroundColor: t.color.bg.pressed },
    rowSelected: { backgroundColor: t.color.accent.subtle, borderLeftColor: t.color.accent.base },
    more: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.space.md,
      paddingHorizontal: t.space.lg,
      paddingVertical: t.space.md,
      backgroundColor: t.color.bg.muted,
    },
  });
