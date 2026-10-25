/**
 * El molde de las pantallas sin sesión (entrar, recuperar, contraseña nueva,
 * invitación).
 *
 * - En pantalla ancha, dos mitades: a la izquierda una foto de un edificio
 *   de departamentos, grande y redondeada sobre el fondo claro, con la frase
 *   en una tarjeta apoyada encima; a la derecha el formulario.
 * - En el teléfono, la foto como franja arriba del formulario.
 * - La foto es genérica (Unsplash, `assets/photos/LICENSE.md`): no es de un
 *   edificio del cliente.
 * - Sube con el teclado y respeta las zonas seguras.
 */
import type { ReactNode } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, ScreenTitle, textStyle, useStyles, useTheme, type Tema } from "@/ui";

const FOTO = require("../../../../assets/photos/access.jpg");
const LOGO = require("../../../../assets/brand/logo.png");

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
            {/* El logo de T&C, completo, arriba del título. */}
            <Image source={LOGO} style={s.logo} resizeMode="contain" accessibilityLabel="T&C Gestión y Administración Inmobiliaria" />
            <ScreenTitle>{titulo}</ScreenTitle>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** En el teléfono: la foto como franja, arriba del título. */
function Marca() {
  const s = useStyles(makeStyles);
  return <Image source={FOTO} style={s.franja} resizeMode="cover" accessibilityIgnoresInvertColors aria-hidden />;
}

function PanelDeMarca() {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.panel}>
      <View style={s.marco}>
        <Image source={FOTO} style={s.foto} resizeMode="cover" accessibilityIgnoresInvertColors aria-hidden />
        <View style={s.frase}>
          <Text accessibilityRole="header" style={[textStyle(t, "display"), s.titular]}>
            Tus edificios, piso por piso.
          </Text>
          <Text style={textStyle(t, "body", t.color.text.secondary)}>Lecturas, recibos y pagos de cada unidad, en un solo lugar.</Text>
        </View>
      </View>
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
    panel: { flex: 1, maxWidth: 680, padding: t.space.xl, backgroundColor: t.color.bg.canvas },
    marco: { flex: 1, borderRadius: t.radius.lg, overflow: "hidden", justifyContent: "flex-end", padding: t.space.xl },
    foto: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%" },
    // La frase va en una tarjeta clara sobre la foto: se lee sin oscurecer la imagen.
    frase: {
      alignSelf: "flex-start",
      maxWidth: 380,
      gap: t.space.sm,
      padding: t.space.xl,
      borderRadius: t.radius.md,
      backgroundColor: t.color.bg.surface,
      ...t.elevation.md,
    },
    // El ancho hace que corte después de la coma: "Tus edificios, / piso por piso."
    titular: { maxWidth: 205 },
    // Las proporciones del logo (720 × 272).
    logo: { width: 180, height: 68 },
    franja: { width: "100%", height: 168, borderRadius: t.radius.lg, marginBottom: t.space.sm },
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

