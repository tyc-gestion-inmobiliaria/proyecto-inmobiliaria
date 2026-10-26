/**
 * Cuántas de un total: un riel de **tramos**, uno por cosa, que llena el
 * ancho que tiene.
 *
 * Un tramo por cosa dice "de siete, van dos" sin obligar a contar casillas
 * chiquitas: los tramos son finos, van separados por un hueco de 2 y llenan
 * su lugar, así que se leen como un avance y no como una fila de cuadraditos.
 * Con más de ocho, los tramos se achican hasta parecer casillas otra vez y
 * va una barra corrida, que es lo que importa: cuánto falta del total.
 * Para una magnitud continua está `CellWithBar`.
 *
 * **El color no es la única señal:** lo que falta va en el mismo riel con
 * otro paso (más claro), lo hecho va lleno, y el número va escrito al lado.
 */
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";

/** Desde aquí va una barra corrida: más tramos ya no se leen como pasos sino como casillas. */
const MAX_CELLS = 8;

export interface MeterProps {
  value: number;
  total: number;
  /** Qué se cuenta, para quien no ve: "secciones", "pasos". */
  unit: string;
  /** El texto de al lado. Sin él, el medidor obliga a contar tramos. */
  label?: string;
  /** Para lo que está en cero o en falta, que no es "poco": es "nada". */
  alert?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Meter({ value, total, unit, label, alert = false, style }: MeterProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const filled = Math.max(0, Math.min(value, total));
  const lleno = alert ? s.alerta : s.lleno;
  return (
    <View
      style={[s.fila, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: filled }}
      accessibilityLabel={`${filled} de ${total} ${unit}`}
    >
      {total > MAX_CELLS ? (
        <View style={[s.riel, s.corrida, s.falta]}>
          <View style={[s.relleno, lleno, { width: `${(filled / total) * 100}%` }]} />
        </View>
      ) : (
        <View style={s.riel}>
          {Array.from({ length: total }, (_, i) => (
            <View key={i} style={[s.tramo, i < filled ? lleno : s.falta]} />
          ))}
        </View>
      )}
      {/* Con `label=""` no va texto: es para cuando la cifra ya está escrita al lado, más grande. */}
      {label === "" ? null : (
        <Text style={[textStyle(t, "data", alert ? t.color.danger.fg : t.color.text.secondary), s.texto]}>{label ?? `${filled}/${total}`}</Text>
      )}
    </View>
  );
}

const ALTO = 8;

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    fila: { flexDirection: "row", alignItems: "center", gap: t.space.md },
    riel: { flexGrow: 1, flexShrink: 1, flexDirection: "row", gap: 2, minWidth: 80, maxWidth: 320, height: ALTO },
    corrida: { borderRadius: ALTO / 2, overflow: "hidden" },
    tramo: { flex: 1, borderRadius: ALTO / 2 },
    relleno: { height: "100%", borderRadius: ALTO / 2 },
    lleno: { backgroundColor: t.color.accent.base },
    alerta: { backgroundColor: t.color.danger.fg },
    // Lo que falta: el riel con un paso que se ve sobre la tarjeta, no un gris apagado que parezca lleno.
    falta: { backgroundColor: t.color.border.strong },
    texto: { flexShrink: 0 },
  });
