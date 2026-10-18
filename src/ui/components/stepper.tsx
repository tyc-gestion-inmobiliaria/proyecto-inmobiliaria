/**
 * Un contador con − y +: cantidades chicas que se cambian de a una
 * (porciones, comensales, partes, entradas).
 *
 * - **Cada botón mide 44×44**: se toca con el pulgar sin apuntar.
 * - **En el tope, el botón de ese lado se apaga** y se queda en su sitio: el
 *   número no salta y se entiende por qué no sube más.
 * - **El lector de pantalla oye un control ajustable** con su valor, y cada
 *   botón dice qué hace ("Quitar uno", "Agregar uno") en vez de "menos".
 * - Para cantidades grandes o con decimales va un `TextField`: apretar el +
 *   cuarenta veces no es una forma de escribir 40.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";

import { pickByInteraction, resolveInteraction, type EstadoPresionable, type ForcedInteraction } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { canStep, stepValue } from "./stepper-logic";

export interface StepperTexts {
  decrease: string;
  increase: string;
}

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Lo que se cuenta: "Cantidad", "Comensales". Lo oye el lector de pantalla. */
  accessibilityLabel: string;
  /** Cómo se escribe el número: "3", "3 personas". */
  format?: (value: number) => string;
  disabled?: boolean;
  texts?: Partial<StepperTexts>;
  /** Solo para vitrina, Storybook y Figma: pinta el + en este estado. */
  forcedState?: ForcedInteraction;
}

const DEFAULT_TEXTS: StepperTexts = { decrease: "Quitar uno", increase: "Agregar uno" };

export function Stepper({ value, onChange, min = 0, max = 99, step = 1, accessibilityLabel, format = String, disabled = false, texts, forcedState }: StepperProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const x = { ...DEFAULT_TEXTS, ...texts };
  const puede = canStep(value, min, max);
  const cambiar = (delta: number) => onChange(stepValue(value, delta, min, max));

  return (
    <View
      style={s.caja}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value, text: format(value) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "increment" && puede.up) cambiar(step);
        if (e.nativeEvent.actionName === "decrement" && puede.down) cambiar(-step);
      }}
    >
      <Boton signo="−" label={`${x.decrease}: ${accessibilityLabel}`} disabled={disabled || !puede.down} onPress={() => cambiar(-step)} />
      <Text style={[textStyle(t, "subtitle", disabled ? t.color.text.disabled : t.color.text.primary), s.valor]} numberOfLines={1}>
        {format(value)}
      </Text>
      <Boton signo="+" label={`${x.increase}: ${accessibilityLabel}`} disabled={disabled || !puede.up} onPress={() => cambiar(step)} forcedState={forcedState} />
    </View>
  );
}

function Boton({ signo, label, disabled, onPress, forcedState }: { signo: string; label: string; disabled: boolean; onPress: () => void; forcedState?: ForcedInteraction }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={(estado: EstadoPresionable) => {
        const i = resolveInteraction(estado, { disabled, forced: forcedState });
        return [
          s.boton,
          pickByInteraction(i, {
            rest: s.botonReposo,
            hovered: s.botonEncima,
            pressed: s.botonPresionado,
            selected: s.botonPresionado,
            disabled: s.botonApagado,
          }),
        ];
      }}
    >
      <Text style={[textStyle(t, "title", disabled ? t.color.text.disabled : t.color.text.primary)]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {signo}
      </Text>
    </Pressable>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    caja: { flexDirection: "row", alignItems: "center", gap: t.space.xs, alignSelf: "flex-start" },
    valor: { minWidth: 40, textAlign: "center", fontVariant: ["tabular-nums"] },
    boton: {
      width: t.minTouch,
      height: t.minTouch,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: t.radius.md,
      borderWidth: 1,
      cursor: "pointer",
    },
    botonReposo: { backgroundColor: t.color.bg.surface, borderColor: t.color.border.strong },
    botonEncima: { backgroundColor: t.color.bg.hover, borderColor: t.color.border.focus },
    // Presionado agrega un borde de 2 además del fondo: el toque se nota sin depender del color.
    botonPresionado: { backgroundColor: t.color.bg.pressed, borderColor: t.color.border.focus, borderWidth: 2 },
    botonApagado: { backgroundColor: t.color.bg.disabled, borderColor: t.color.bg.disabled, cursor: "auto" },
  });
