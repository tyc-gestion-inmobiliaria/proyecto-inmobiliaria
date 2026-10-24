/**
 * El molde de las pantallas sin sesión (entrar, recuperar, contraseña nueva):
 * una tarjeta centrada que sube con el teclado y respeta las zonas seguras,
 * con la marca encima.
 */
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, Icon, ScreenTitle, textStyle, useStyles, useTheme, type Tema } from "@/ui";

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
        <View style={s.marca} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Icon name="building" size="lg" color={t.color.text.onAccent} />
        </View>
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
  const s = useStyles(makeStyles);
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.aviso}>
      <Icon name="alert-circle" size="sm" color={t.color.danger.fg} style={s.signo} />
      <Text style={[textStyle(t, "bodySmall", t.color.danger.fg), s.textoAviso]}>{children}</Text>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    fondo: { flex: 1, backgroundColor: t.color.bg.canvas },
    contenido: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: t.space.lg },
    tarjeta: { width: "100%", maxWidth: 400, gap: t.space.lg, ...t.elevation.sm },
    marca: {
      width: 48,
      height: 48,
      marginBottom: t.space.lg,
      borderRadius: t.radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.color.accent.base,
    },
    aviso: {
      flexDirection: "row",
      gap: t.space.sm,
      padding: t.space.md,
      borderRadius: t.radius.sm,
      backgroundColor: t.color.danger.bg,
    },
    signo: { marginTop: 1 },
    textoAviso: { flex: 1 },
  });
