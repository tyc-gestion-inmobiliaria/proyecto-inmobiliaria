/**
 * Quién: las iniciales de una persona en un círculo.
 *
 * No se toca. Si hace falta abrir la ficha de alguien, el `Avatar` va dentro
 * del botón o la fila que la abre, que es lo que dice los cuatro estados.
 *
 * El lector de pantalla oye el nombre entero, no las iniciales: "MP" no le
 * dice nada a nadie.
 */
import { StyleSheet, Text, View } from "react-native";

import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { initials } from "./avatar-logic";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
  name: string;
  size?: AvatarSize;
  /** Para quien todavía no tiene a nadie asignado: borde punteado, sin relleno. */
  empty?: boolean;
  /** Lo que se oye. Por defecto, el nombre. */
  accessibilityLabel?: string;
}

const SIZES: Record<AvatarSize, number> = { sm: 24, md: 32, lg: 40 };

export function Avatar({ name, size = "md", empty = false, accessibilityLabel }: AvatarProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const d = SIZES[size];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? name}
      style={[s.circle, { width: d, height: d, borderRadius: d / 2 }, empty && s.empty]}
    >
      <Text
        style={[
          textStyle(t, size === "sm" ? "caption" : "bodySmall", empty ? t.color.text.secondary : t.color.accent.text),
          s.text,
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {empty ? "?" : initials(name)}
      </Text>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    circle: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.color.accent.subtle,
    },
    empty: {
      backgroundColor: t.color.bg.surface,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: t.color.border.strong,
    },
    text: { fontWeight: "600" },
  });
