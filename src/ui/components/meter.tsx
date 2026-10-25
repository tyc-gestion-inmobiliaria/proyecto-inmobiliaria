/**
 * Cuántas de un total, dibujado como **casillas** y no como barra.
 *
 * Una barra continua dice "esta magnitud contra aquella"; un medidor de siete
 * casillas dice "de siete cosas, van dos". Cuando el total es una lista corta
 * y cerrada, el ojo cuenta las casillas vacías, que es justo la pregunta:
 * cuántas faltan. Para una magnitud continua está `CellWithBar`.
 *
 * **El color no es la única señal:** lo hecho va relleno y lo que falta va
 * hueco con su borde, así que la diferencia se ve en la forma, y el número va
 * escrito al lado.
 */
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";

/** Desde aquí se dibuja una barra: veinte casillas ya no se cuentan de un vistazo ni caben en un teléfono. */
const MAX_CELLS = 20;

export interface MeterProps {
  value: number;
  total: number;
  /** Qué se cuenta, para quien no ve: "secciones", "pasos". */
  unit: string;
  /** El texto de al lado. Sin él, el medidor obliga a contar casillas. */
  label?: string;
  /** Para lo que está en cero o en falta, que no es "poco": es "nada". */
  alert?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Meter({ value, total, unit, label, alert = false, style }: MeterProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const filled = Math.max(0, Math.min(value, total));
  return (
    <View
      style={[s.row, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: filled }}
      accessibilityLabel={`${filled} de ${total} ${unit}`}
    >
      {total > MAX_CELLS ? (
        // Con muchas, las casillas no caben ni se cuentan: una barra hueca que se llena.
        <View style={[s.bar, s.cellEmpty]}>
          <View style={[s.barFill, alert ? s.cellAlert : s.cellFilled, { width: `${(filled / total) * 100}%` }]} />
        </View>
      ) : (
        <View style={s.track}>
          {Array.from({ length: total }, (_, i) => (
            <View key={i} style={[s.cell, i < filled ? (alert ? s.cellAlert : s.cellFilled) : s.cellEmpty]} />
          ))}
        </View>
      )}
      {/* Con `label=""` no va texto: es para cuando la cifra ya está escrita al lado, más grande. */}
      {label === "" ? null : (
        <Text style={textStyle(t, "data", alert ? t.color.danger.fg : t.color.text.secondary)}>{label ?? `${filled}/${total}`}</Text>
      )}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: t.space.md - 2 },
    track: { flexDirection: "row", gap: 3 },
    cell: { width: 10, height: 14, borderRadius: 2 },
    bar: { flexGrow: 1, flexShrink: 1, minWidth: 80, maxWidth: 240, height: 14, borderRadius: 3, overflow: "hidden" },
    barFill: { height: "100%" },
    cellFilled: { backgroundColor: t.color.accent.base },
    cellAlert: { backgroundColor: t.color.danger.fg },
    // Hueca con borde, no gris claro: así se distingue de una llena apagada.
    cellEmpty: { borderWidth: 1, borderColor: t.color.text.tertiary, backgroundColor: "transparent" },
  });
