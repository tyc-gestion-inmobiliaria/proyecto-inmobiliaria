/**
 * Un botón que borra o apaga algo y pregunta antes de hacerlo.
 *
 * El primer toque no hace nada irreversible: cambia el botón por la pregunta
 * y dos salidas, con "No" primero. Un dedo que se resbala sobre "Quitar" no
 * se deshace; uno que se resbala sobre "No" no hace daño.
 *
 * Sin diálogo a propósito: la pregunta aparece donde estaba el botón, así que
 * la vista no salta a otro sitio de la pantalla.
 */
import { useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { Button, type ButtonSize, type ButtonVariant } from "./button";

export interface ConfirmButtonProps {
  label: string;
  /** Lo que se pregunta, corto: "¿Quitar este registro?". */
  question: string;
  /** El texto del botón que sí lo hace: "Sí, quitar". */
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Arranca ya preguntando. Solo para vitrina y Storybook. */
  initiallyAsking?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ConfirmButton({
  label,
  question,
  confirmLabel,
  cancelLabel = "No",
  onConfirm,
  variant = "secondary",
  size = "sm",
  disabled,
  accessibilityLabel,
  initiallyAsking = false,
  style,
}: ConfirmButtonProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [asking, setAsking] = useState(initiallyAsking);

  if (!asking) {
    return (
      <Button
        label={label}
        variant={variant}
        size={size}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        onPress={() => setAsking(true)}
        style={style}
      />
    );
  }

  return (
    <View style={[s.row, style]}>
      <Text style={[textStyle(t, "bodySmall"), s.question]} accessibilityLiveRegion="polite">
        {question}
      </Text>
      <Button label={cancelLabel} variant="secondary" size={size} onPress={() => setAsking(false)} />
      <Button
        label={confirmLabel}
        variant="danger"
        size={size}
        onPress={() => {
          setAsking(false);
          void onConfirm();
        }}
      />
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: t.space.sm },
    question: { fontWeight: "600" },
  });
