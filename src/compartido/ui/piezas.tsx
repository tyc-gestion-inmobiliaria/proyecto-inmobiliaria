/**
 * Piezas que comparten las pantallas de los módulos.
 *
 * - `CampoDeOpciones`: fichas de una sola elección con su etiqueta y su
 *   error junto a ellas, igual que `TextField` (el signo además del color).
 * - `Aviso`: un aviso de advertencia con su signo y su borde; el color no es
 *   la única señal.
 * - `Volver`: el enlace para subir un nivel, siempre arriba a la izquierda.
 * - `FlechaDeFila`: lo que dice, sin pasar el puntero, que una fila se abre
 *   (y adónde lleva, si hace falta decirlo). Es decorativa: la fila ya lleva
 *   su etiqueta para quien no ve.
 */
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, ChoiceChips, FieldLabel, Icon, textStyle, useStyles, useTheme, type Tema } from "@/ui";

export function CampoDeOpciones<T extends string>({
  label,
  required,
  options,
  value,
  onChange,
  clearable,
  error,
  helper,
}: {
  label: string;
  required?: boolean;
  options: { id: T; label: string; disabled?: boolean }[];
  value: T | undefined;
  onChange: (valor: T | undefined) => void;
  clearable?: boolean;
  error?: string;
  helper?: string;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.campo}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <ChoiceChips options={options} value={value} onChange={onChange} clearable={clearable} accessibilityLabel={label} />
      {error ? (
        <View style={s.fila} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <Text style={[textStyle(t, "caption", t.color.danger.fg), s.signo]}>!</Text>
          <Text style={[textStyle(t, "caption", t.color.danger.fg), s.texto]}>{error}</Text>
        </View>
      ) : helper ? (
        <Text style={textStyle(t, "caption", t.color.text.secondary)}>{helper}</Text>
      ) : null}
    </View>
  );
}

export function Aviso({ children, testID }: { children: ReactNode; testID?: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.aviso} accessibilityRole="alert" testID={testID}>
      <Icon name="alert-triangle" color={t.color.warning.fg} style={s.signoAviso} />
      <Text style={[textStyle(t, "body", t.color.warning.fg), s.texto]}>{children}</Text>
    </View>
  );
}

export function Volver({ label, onPress }: { label: string; onPress: () => void }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.volver}>
      <Button variant="ghost" size="sm" icon="chevron-left" label={label} accessibilityLabel={`Volver a ${label.toLowerCase()}`} onPress={onPress} />
    </View>
  );
}

export function FlechaDeFila({ texto }: { texto?: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.flecha} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {texto ? <Text style={[textStyle(t, "bodySmall", t.color.accent.text), s.flechaTexto]}>{texto}</Text> : null}
      <Icon name="chevron-right" size="sm" color={t.color.accent.text} />
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    campo: { gap: t.space.xs + 2 },
    fila: { flexDirection: "row", gap: t.space.xs },
    signo: { fontWeight: "700" },
    texto: { flex: 1 },
    aviso: {
      flexDirection: "row",
      gap: t.space.sm,
      padding: t.space.md,
      borderRadius: t.radius.sm,
      borderLeftWidth: 4,
      borderLeftColor: t.color.warning.fg,
      backgroundColor: t.color.warning.bg,
    },
    signoAviso: { marginTop: 1 },
    volver: { alignSelf: "flex-start", marginLeft: -t.space.sm },
    flecha: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: t.space.xxs, minWidth: 32 },
    flechaTexto: { fontWeight: "600" },
  });
