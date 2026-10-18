/**
 * El molde de las pantallas sin sesión (entrar, recuperar, contraseña nueva):
 * una tarjeta centrada que sube con el teclado y respeta las zonas seguras.
 */
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, ScreenTitle, textStyle, useStyles, useTheme, type Tema } from "@/ui";

export function TarjetaDeAcceso({ titulo, children }: { titulo: string; children: ReactNode }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={s.fondo} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[s.contenido, { paddingTop: insets.top + t.space.xl, paddingBottom: insets.bottom + t.space.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={s.tarjeta} padding="xl">
          <ScreenTitle>{titulo}</ScreenTitle>
          {children}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Un error que no es de ningún campo: va arriba del botón, con signo y texto. */
export function AvisoGeneral({ children }: { children: string }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={textStyle(t, "bodySmall", t.color.danger.fg)}>
      ⚠ {children}
    </Text>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    fondo: { flex: 1, backgroundColor: t.color.bg.canvas },
    contenido: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: t.space.lg },
    tarjeta: { width: "100%", maxWidth: 400 },
  });
