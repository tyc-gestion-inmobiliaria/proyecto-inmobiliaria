/**
 * Lo que dice la pantalla después de una acción: qué pasó, con su signo
 * además del color (✓ hecho, ! falló). Se anuncia sin mover el foco.
 */
import { Text } from "react-native";

import { textStyle, useTheme } from "@/ui";

export type AvisoDeAccion = { tono: "ok" | "error"; texto: string };

export function LineaDeAviso({ aviso }: { aviso: AvisoDeAccion | null }) {
  const t = useTheme();
  if (!aviso) return null;
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={textStyle(t, "body", aviso.tono === "ok" ? t.color.success.fg : t.color.danger.fg)}
    >
      {aviso.tono === "ok" ? `✓ ${aviso.texto}` : `! ${aviso.texto}`}
    </Text>
  );
}
