/**
 * Un estilo de texto de la escala tipográfica, listo para `style`.
 *
 * Las familias del tema son pilas de CSS ("system-ui, -apple-system, …"). En
 * web se pasan tal cual. En iOS y Android una pila no es un nombre de fuente:
 * se usa la del sistema, salvo que la pila empiece por un nombre entre
 * comillas (`"Plus Jakarta Sans", system-ui, …`), que es una fuente que el
 * proyecto incrusta con el plugin de `expo-font` y se pide por su nombre.
 *
 * Las cifras van con números tabulares cuando el estilo lo pide (`numeric`):
 * las columnas de montos alinean sin pasar a letra monoespaciada.
 */
import { Platform, type TextStyle } from "react-native";

import type { Tema, TypeStyle } from "../tokens";

export function fontFamily(stack: string): string | undefined {
  if (Platform.OS === "web") return stack;
  if (!stack.includes(",")) return stack;
  const primera = stack.split(",")[0].trim();
  const nombrada = primera.match(/^["'](.+)["']$/);
  return nombrada ? nombrada[1] : undefined;
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
    ...(s.numeric === "tabular" ? { fontVariant: ["tabular-nums"] as TextStyle["fontVariant"] } : {}),
    color,
  };
}
