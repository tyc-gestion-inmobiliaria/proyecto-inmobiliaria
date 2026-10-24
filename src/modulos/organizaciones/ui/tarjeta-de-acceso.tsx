/**
 * El molde de las pantallas sin sesión (entrar, recuperar, contraseña nueva,
 * invitación).
 *
 * - En pantalla ancha, dos mitades: a la izquierda el panel de noche con la
 *   fachada de una cuadra de edificios que se encienden (lo que administra quien entra)
 *   y una frase; a la derecha el formulario.
 * - En el teléfono, solo el formulario con una fachada chica encima: el panel
 *   empujaría los campos fuera de la vista.
 * - El panel va siempre de noche, con los tokens del tema oscuro, venga la
 *   app en claro u oscuro.
 * - Sube con el teclado y respeta las zonas seguras.
 */
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { temaOscuroDelProyecto as noche } from "@/tema";
import { Icon, ScreenTitle, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import { Fachada } from "./fachada";

const ANCHO_CON_PANEL = 960;

export function TarjetaDeAcceso({ titulo, children }: { titulo: string; children: ReactNode }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const conPanel = width >= ANCHO_CON_PANEL;

  return (
    <View style={s.fondo}>
      {conPanel ? <PanelDeMarca /> : null}
      <KeyboardAvoidingView style={s.lado} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[s.contenido, { paddingTop: insets.top + t.space.xl, paddingBottom: insets.bottom + t.space.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.formulario}>
            {conPanel ? null : <Marca />}
            <ScreenTitle>{titulo}</ScreenTitle>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** En el teléfono: la fachada chica, de noche, en lugar del panel. */
function Marca() {
  return (
    <View style={panel.marca}>
      <Fachada escala="chica" />
    </View>
  );
}

function PanelDeMarca() {
  return (
    <View style={panel.fondo}>
      <View style={panel.mensaje}>
        <Text accessibilityRole="header" style={[textStyle(noche, "display", noche.color.text.primary), panel.titular]}>
          Tus edificios, piso por piso.
        </Text>
        <Text style={[textStyle(noche, "subtitle", noche.color.text.secondary), panel.bajada]}>
          Lecturas, recibos y pagos de cada unidad, en un solo lugar.
        </Text>
      </View>
      <Fachada />
    </View>
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
    fondo: { flex: 1, flexDirection: "row", backgroundColor: t.color.bg.surface },
    lado: { flex: 1 },
    contenido: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: t.space.xl },
    formulario: { width: "100%", maxWidth: 380, gap: t.space.lg },
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

/** El panel de noche: con los tokens del tema oscuro, sin depender del tema de la app. */
const panel = StyleSheet.create({
  fondo: {
    flex: 1,
    maxWidth: 640,
    justifyContent: "space-between",
    paddingTop: noche.space.xxl * 2,
    paddingHorizontal: noche.space.xxl,
    backgroundColor: noche.color.bg.canvas,
  },
  mensaje: { gap: noche.space.lg, maxWidth: 400 },
  // Grande y apretado: el titular es lo primero que se lee, y con la fachada basta de decorado.
  // Su ancho hace que corte después de la coma: "Tus edificios, / piso por piso."
  titular: {
    maxWidth: 340,
    fontSize: noche.typography.scale.display.fontSize * 1.5,
    lineHeight: noche.typography.scale.display.lineHeight * 1.35,
    letterSpacing: (noche.typography.scale.display.letterSpacing ?? 0) * 2,
  },
  bajada: { fontWeight: "400", maxWidth: 360 },
  marca: {
    alignSelf: "flex-start",
    paddingTop: noche.space.md,
    paddingHorizontal: noche.space.md,
    borderRadius: noche.radius.md,
    backgroundColor: noche.color.bg.canvas,
    overflow: "hidden",
  },
});
