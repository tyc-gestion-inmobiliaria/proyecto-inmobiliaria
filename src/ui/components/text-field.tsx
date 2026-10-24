/**
 * Un campo de texto con su etiqueta, su ayuda y su error.
 *
 * - **La etiqueta va arriba y siempre visible**, no como placeholder: el
 *   placeholder desaparece al escribir y deja a la persona sin saber qué
 *   estaba llenando.
 * - **El error no es solo rojo:** cambia el borde, aparece un texto que dice
 *   qué pasa, y el campo lo anuncia a quien no ve. El color nunca es la única
 *   señal.
 * - **La ayuda (`helper`)** es para lo que cambia lo que la persona va a
 *   escribir ("a partir de S/ 700 hace falta el DNI"), no para explicar el
 *   sistema. Si hay error, el error ocupa su sitio.
 * - **El ✕ de limpiar** solo aparece con algo escrito: un ✕ sobre un campo
 *   vacío es un botón que no hace nada.
 */
import { useState, type Ref } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputKeyPressEventData,
  type ViewStyle,
} from "react-native";

import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import { TouchArea } from "./touch-area";
import type { Tema } from "../tokens";

/** La etiqueta de un campo. La usan también `Select` y los formularios. */
export function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  const t = useTheme();
  return (
    <Text style={textStyle(t, "label", t.color.text.secondary)}>
      {children}
      {required ? <Text accessibilityLabel=" obligatorio"> *</Text> : null}
    </Text>
  );
}

export type TextFieldTone = "default" | "readonly" | "disabled";

export interface TextFieldProps {
  label?: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  /** Lo que cambia lo que la persona va a escribir. Se oculta si hay error. */
  helper?: string;
  /** Qué está mal y cómo se arregla. Con esto el campo se marca. */
  error?: string | null;
  tone?: TextFieldTone;
  required?: boolean;
  /** Para cifras y códigos: el estilo de dato, con números tabulares. */
  mono?: boolean;
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  accessibilityLabel?: string;
  onKeyPress?: (evento: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
  onSubmitEditing?: () => void;
  /** Dibuja el ✕ que vacía el campo. */
  onClear?: () => void;
  clearLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Para llevar el foco al campo, por ejemplo desde un resumen de errores. */
  inputRef?: Ref<TextInput>;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  error,
  tone = "default",
  required = false,
  mono = false,
  multiline = false,
  secureTextEntry = false,
  autoCapitalize,
  keyboardType,
  autoFocus = false,
  accessibilityLabel,
  onKeyPress,
  onSubmitEditing,
  onClear,
  clearLabel = "Limpiar el campo",
  style,
  testID,
  inputRef,
}: TextFieldProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const editable = tone === "default";
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hasError = Boolean(error);
  const fuente = mono ? textStyle(t, "data") : textStyle(t, "body");

  return (
    <View style={[s.wrap, style]}>
      {label ? <FieldLabel required={required}>{label}</FieldLabel> : null}
      {editable ? (
        <View style={s.box} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
          <TextInput
            ref={inputRef}
            testID={testID}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityHint={hasError ? (error ?? undefined) : helper}
            aria-invalid={hasError}
            aria-required={required}
            value={value}
            onChangeText={onChangeText}
            onKeyPress={onKeyPress}
            onSubmitEditing={onSubmitEditing}
            placeholder={placeholder}
            placeholderTextColor={t.color.text.placeholder}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
            autoFocus={autoFocus}
            multiline={multiline}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[
              s.input,
              fuente,
              mono && s.monoSize,
              multiline && s.multiline,
              hovered && !focused && s.inputHovered,
              hasError && s.inputError,
              focused && (hasError ? s.focusedError : s.focused),
              onClear && s.withClear,
            ]}
          />
          {onClear && value.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={clearLabel}
              onPress={onClear}
              hitSlop={8}
              style={(state: EstadoPresionable) => {
                const i = resolveInteraction(state);
                return [s.clear, i === "hovered" && s.clearHovered, i === "pressed" && s.clearPressed];
              }}
            >
              <Text style={[s.clearText, { color: t.color.text.secondary }]}>✕</Text>
              <TouchArea height={32} width={32} border={0} />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View
          accessibilityLabel={label ? `${label}: ${value || placeholder || "vacío"}` : undefined}
          accessibilityState={{ disabled: tone === "disabled" }}
          style={[s.input, tone === "readonly" ? s.readonly : s.disabled]}
        >
          <Text style={[fuente, mono && s.monoSize, tone === "disabled" && { color: t.color.text.disabled }]}>
            {value || placeholder || "—"}
          </Text>
        </View>
      )}
      {hasError ? (
        <View style={s.messageRow} accessibilityLiveRegion="polite" accessibilityRole="alert">
          {/* El signo va además del color: quien no distingue el rojo lo ve igual. */}
          <Text style={[textStyle(t, "caption", t.color.danger.fg), s.messageIcon]}>!</Text>
          <Text style={[textStyle(t, "caption", t.color.danger.fg), s.messageText]}>{error}</Text>
        </View>
      ) : helper ? (
        <Text style={textStyle(t, "caption", t.color.text.secondary)}>{helper}</Text>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    wrap: { gap: t.space.xs + 2 },
    box: { position: "relative", justifyContent: "center" },
    input: {
      minHeight: t.control.md,
      borderWidth: 1,
      borderColor: t.color.border.strong,
      borderRadius: t.radius.sm,
      backgroundColor: t.color.bg.surface,
      paddingHorizontal: t.space.md,
      paddingVertical: 10,
      justifyContent: "center",
      // El aro del navegador se apaga y se dibuja el nuestro con el foco.
      outlineWidth: 0,
    },
    inputHovered: { borderColor: t.color.text.secondary },
    inputError: { borderColor: t.color.danger.fg, borderWidth: 2, paddingHorizontal: t.space.md - 1 },
    focused: {
      borderColor: t.color.border.focus,
      outlineStyle: "solid",
      outlineWidth: 2,
      outlineColor: t.color.border.focus,
      outlineOffset: 2,
    },
    focusedError: {
      outlineStyle: "solid",
      outlineWidth: 2,
      outlineColor: t.color.danger.fg,
      outlineOffset: 2,
    },
    monoSize: { fontSize: 15 },
    multiline: { minHeight: 92, textAlignVertical: "top" },
    withClear: { paddingRight: 44 },
    readonly: { backgroundColor: t.color.bg.muted, borderColor: t.color.border.default },
    disabled: { backgroundColor: t.color.bg.disabled, borderColor: t.color.border.default },
    clear: {
      position: "absolute",
      right: 6,
      width: 32,
      height: 32,
      borderRadius: t.radius.sm,
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    },
    clearHovered: { backgroundColor: t.color.bg.hover },
    clearPressed: { backgroundColor: t.color.bg.pressed },
    clearText: { fontSize: 13 },
    messageRow: { flexDirection: "row", gap: t.space.xs + 2, alignItems: "flex-start" },
    messageIcon: {
      fontWeight: "700",
      width: 16,
      height: 16,
      lineHeight: 16,
      textAlign: "center",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.color.danger.fg,
      fontSize: 11,
    },
    messageText: { flex: 1 },
  });
