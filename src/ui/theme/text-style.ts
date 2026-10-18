/**
 * Un estilo de texto de la escala tipográfica, listo para `style`.
 *
 * Las familias del tema son pilas de CSS ("system-ui, -apple-system, …"). En
 * web se pasan tal cual; en iOS y Android una pila no es un nombre de fuente
 * y se usa la del sistema, salvo que el tema traiga un nombre suelto (una
 * fuente cargada con `expo-font`).
 */
import { Platform, type TextStyle } from "react-native";

import type { Tema, TypeStyle } from "../tokens";

export function fontFamily(stack: string): string | undefined {
  if (Platform.OS === "web") return stack;
  return stack.includes(",") ? undefined : stack;
}

export function textStyle(
  theme: Tema,
  variant: keyof Tema["typography"]["scale"],
  color: string = theme.color.text.primary,
): TextStyle {
  const s: TypeStyle = theme.typography.scale[variant];
  return {
    fontFamily: fontFamily(theme.typography.family[s.family]),
    fontSize: s.fontSize,
    lineHeight: s.lineHeight,
    fontWeight: s.fontWeight,
    letterSpacing: s.letterSpacing,
    textTransform: s.textTransform,
    color,
  };
}
