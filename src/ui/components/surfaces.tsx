/**
 * Superficies y textos de base: la tarjeta, los títulos, la fila de dato y el
 * punto de estado.
 *
 * No hay "etiqueta encima del título" (eyebrow) a propósito: el menú lateral
 * ya dice en qué sección se está, y repetirlo en versalitas encima del título
 * es decorado que ocupa una línea.
 */
import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { resolveInteraction, type EstadoPresionable, type ForcedInteraction } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";

export type SurfaceVariant = "outlined" | "elevated" | "flat";

/**
 * Un fondo con borde, sombra o nada. `Card` es una `Surface` con relleno y
 * separación entre hijos, que es lo que pide casi siempre.
 */
export function Surface({
  children,
  variant = "outlined",
  style,
}: {
  children: ReactNode;
  variant?: SurfaceVariant;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useStyles(makeStyles);
  return <View style={[s.surface, s[variant], style]}>{children}</View>;
}

/**
 * Con `onPress`, la tarjeta entera se abre: es un enlace (puede llevar
 * insignias, no botones adentro), avisa encima con el borde de foco y el
 * fondo, y confirma el toque con un fondo más oscuro. Su etiqueta tiene que
 * decir lo que dice la tarjeta.
 */
export function Card({
  children,
  variant = "outlined",
  padding = "lg",
  style,
  onPress,
  accessibilityLabel,
  forcedState,
  testID,
}: {
  children: ReactNode;
  variant?: SurfaceVariant;
  padding?: "md" | "lg" | "xl";
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Solo para vitrina, Storybook y Figma. */
  forcedState?: ForcedInteraction;
  testID?: string;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const relleno = { padding: t.space[padding], gap: t.space.md - 2 };
  if (!onPress) {
    return (
      <Surface variant={variant} style={[relleno, style]}>
        {children}
      </Surface>
    );
  }
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      testID={testID}
      style={(estado: EstadoPresionable) => {
        const i = resolveInteraction(estado, { forced: forcedState });
        return [
          s.surface,
          s[variant],
          s.tocable,
          relleno,
          i === "hovered" && s.encima,
          i === "pressed" && s.presionada,
          style,
        ];
      }}
    >
      {children}
    </Pressable>
  );
}

/** El título de una pantalla. Va solo: sin etiqueta encima ni bajada debajo. */
export function ScreenTitle({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="header" style={textStyle(t, "title")}>
      {children}
    </Text>
  );
}

/** El título de un diálogo: más chico que el de una pantalla, ya está enmarcado. */
export function DialogTitle({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="header" style={textStyle(t, "dialogTitle")}>
      {children}
    </Text>
  );
}

/** El nombre de una sección dentro de una pantalla. */
export function SectionTitle({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="header" style={textStyle(t, "subtitle")}>
      {children}
    </Text>
  );
}

/** Un rótulo chico en versalitas, para nombrar un grupo de datos. */
export function SectionLabel({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={textStyle(t, "label", t.color.text.tertiary)}>{children}</Text>;
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  const t = useTheme();
  return <Text style={textStyle(t, "body", muted ? t.color.text.secondary : t.color.text.primary)}>{children}</Text>;
}

/** Etiqueta a la izquierda y valor a la derecha, como en un resumen. */
export function KeyValueRow({
  label,
  value,
  muted,
  danger,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  danger?: boolean;
  strong?: boolean;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.row}>
      <Text
        style={[
          textStyle(t, muted ? "bodySmall" : "body", strong ? t.color.text.primary : t.color.text.secondary),
          strong && s.strong,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          textStyle(t, "data", muted ? t.color.text.tertiary : t.color.text.primary),
          danger && { color: t.color.danger.fg },
          strong && s.strong,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

/**
 * Un punto de estado con su palabra al lado. La palabra va siempre: quien no
 * distingue el verde del rojo se queda sin el dato si solo está el punto.
 */
export function StatusDot({ tone, label }: { tone: StatusTone; label: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const color = tone === "neutral" ? t.color.text.secondary : t.color[tone].fg;
  return (
    <View style={s.statusRow}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={[textStyle(t, "caption", color), s.statusText]}>{label}</Text>
    </View>
  );
}

/**
 * Una insignia que no se toca: un estado escrito sobre su fondo. Para lo que
 * se toca está `Chip`.
 */
export function Badge({ tone = "neutral", label }: { tone?: StatusTone; label: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const fg = tone === "neutral" ? t.color.text.secondary : t.color[tone].fg;
  const bg = tone === "neutral" ? t.color.bg.muted : t.color[tone].bg;
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[textStyle(t, "caption", fg), s.badgeText]}>{label}</Text>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    // Esquinas continuas en iOS (squircle); en web y Android, el radio de siempre.
    surface: { backgroundColor: t.color.bg.surface, borderRadius: t.radius.md, ...(Platform.OS === "ios" ? { borderCurve: "continuous" as const } : null) },
    // Borde casi invisible y sombra suave: la tarjeta se separa del fondo sin dibujar una caja.
    outlined: { borderWidth: 1, borderColor: t.color.border.subtle, ...t.elevation.sm },
    elevated: { ...t.elevation.md },
    flat: { backgroundColor: t.color.bg.muted },
    tocable: { cursor: "pointer" },
    encima: { backgroundColor: t.color.bg.hover, borderColor: t.color.border.focus },
    presionada: { backgroundColor: t.color.bg.pressed, borderColor: t.color.border.focus },
    row: { flexDirection: "row", justifyContent: "space-between", gap: t.space.md },
    strong: { fontWeight: "600" },
    statusRow: { flexDirection: "row", alignItems: "center", gap: t.space.xs + 2 },
    dot: { width: 9, height: 9, borderRadius: 5 },
    statusText: { fontWeight: "500" },
    badge: {
      alignSelf: "flex-start",
      paddingHorizontal: t.space.sm,
      paddingVertical: t.space.xxs,
      borderRadius: t.radius.full,
    },
    badgeText: { fontWeight: "600" },
  });
