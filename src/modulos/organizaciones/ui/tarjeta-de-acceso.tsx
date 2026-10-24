/**
 * El molde de las pantallas sin sesión (entrar, recuperar, contraseña nueva,
 * invitación).
 *
 * - En pantalla ancha, dos mitades: a la izquierda el panel de la marca con
 *   lo que la app resuelve, a la derecha el formulario.
 * - En el teléfono, solo el formulario con la marca encima: el panel
 *   empujaría los campos fuera de la vista.
 * - Sube con el teclado y respeta las zonas seguras.
 */
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, ScreenTitle, textStyle, useStyles, useTheme, type Tema } from "@/ui";
import type { IconName } from "@/ui/components/icon-paths";

const ANCHO_CON_PANEL = 960;

const PUNTOS: readonly { icono: IconName; texto: string }[] = [
  { icono: "calendar-check", texto: "El cierre del mes en cuatro pasos, con lo que falta a la vista" },
  { icono: "receipt", texto: "Recibos con el prorrateo y el agua ya calculados" },
  { icono: "wallet", texto: "Cada pago validado contra el recibo que paga" },
];

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

function Marca({ sobreAcento = false }: { sobreAcento?: boolean }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View
      style={[s.marca, sobreAcento && s.marcaSobreAcento]}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Icon name="building" size="lg" color={sobreAcento ? t.color.accent.base : t.color.text.onAccent} />
    </View>
  );
}

function PanelDeMarca() {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const texto = t.color.text.onAccent;
  return (
    <View style={s.panel}>
      {/* Dos aros de fondo: solo textura. */}
      <View style={[s.aro, s.aroGrande]} aria-hidden />
      <View style={[s.aro, s.aroChico]} aria-hidden />
      <Marca sobreAcento />
      <View style={s.mensaje}>
        <Text accessibilityRole="header" style={textStyle(t, "display", texto)}>
          Tus edificios, al día.
        </Text>
        <View style={s.puntos}>
          {PUNTOS.map((p) => (
            <View key={p.icono} style={s.punto}>
              <View style={s.iconoPunto} aria-hidden>
                <Icon name={p.icono} size="sm" color={texto} />
              </View>
              <Text style={[textStyle(t, "body", texto), s.textoPunto]}>{p.texto}</Text>
            </View>
          ))}
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

/** Una nota que cambia lo que la persona va a hacer, con su signo. */
export function NotaDeAcceso({ children }: { children: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.nota}>
      <Icon name="info" size="sm" color={t.color.info.fg} style={s.signo} />
      <Text style={[textStyle(t, "bodySmall", t.color.info.fg), s.textoAviso]}>{children}</Text>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    fondo: { flex: 1, flexDirection: "row", backgroundColor: t.color.bg.surface },
    lado: { flex: 1 },
    contenido: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: t.space.xl },
    formulario: { width: "100%", maxWidth: 380, gap: t.space.lg },
    marca: {
      width: 48,
      height: 48,
      marginBottom: t.space.sm,
      borderRadius: t.radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.color.accent.base,
    },
    marcaSobreAcento: { backgroundColor: t.color.text.onAccent },
    panel: {
      flex: 1,
      maxWidth: 640,
      overflow: "hidden",
      justifyContent: "space-between",
      padding: t.space.xxl,
      backgroundColor: t.color.accent.base,
    },
    aro: { position: "absolute", borderRadius: t.radius.full, borderWidth: 1, borderColor: t.color.text.onAccent, opacity: 0.14 },
    aroGrande: { width: 560, height: 560, right: -220, bottom: -200 },
    aroChico: { width: 300, height: 300, right: -60, bottom: -60 },
    mensaje: { gap: t.space.xl, maxWidth: 440 },
    puntos: { gap: t.space.lg },
    punto: { flexDirection: "row", alignItems: "center", gap: t.space.md },
    iconoPunto: {
      width: 36,
      height: 36,
      borderRadius: t.radius.sm,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: t.color.text.onAccent,
    },
    textoPunto: { flex: 1 },
    aviso: {
      flexDirection: "row",
      gap: t.space.sm,
      padding: t.space.md,
      borderRadius: t.radius.sm,
      backgroundColor: t.color.danger.bg,
    },
    nota: {
      flexDirection: "row",
      gap: t.space.sm,
      padding: t.space.md,
      borderRadius: t.radius.sm,
      backgroundColor: t.color.info.bg,
    },
    signo: { marginTop: 1 },
    textoAviso: { flex: 1 },
  });
