/**
 * Un valor contra el rango en que conviene tenerlo: un piso y un techo.
 *
 * Sirve para lo que se mide contra "ni muy poco ni demasiado": un stock con
 * su mínimo y su máximo, un saldo con su colchón, una temperatura. Contesta
 * de un vistazo **de qué lado del rango está** y cuánto le falta o le sobra.
 *
 * - **La banda** entre el piso y el techo es la zona deseada, con sus dos
 *   marcas; el relleno es el valor.
 * - **La zona va escrita con su signo** (✕ vacío, ↓ bajo, ✓ en rango,
 *   ↑ alto) además del color del relleno: quien no distingue el rojo del
 *   verde lee la palabra, y el lector de pantalla también.
 * - **El piso cuenta como bajo** (`levelZone`): es el punto en que hay que
 *   actuar, no el último valor aceptable.
 *
 * Para contar cosas de una lista corta está `Meter`; para comparar una cifra
 * con las de su columna, `CellWithBar`.
 */
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { levelPositions, levelZone, type LevelZone } from "./level-logic";

export interface LevelBarTexts {
  empty: string;
  low: string;
  ok: string;
  high: string;
  /** Lo que se oye: el valor, la zona y el rango. */
  summary: (value: string, zone: string, low: string, high: string) => string;
}

const TEXTS: LevelBarTexts = {
  empty: "Vacío",
  low: "Bajo",
  ok: "En rango",
  high: "Alto",
  summary: (v, z, lo, hi) => `${v}, ${z}. Rango de ${lo} a ${hi}`,
};

const SIGN: Record<LevelZone, string> = { empty: "✕", low: "↓", ok: "✓", high: "↑" };

export interface LevelBarProps {
  value: number;
  /** El piso: en él o por debajo, la zona es "bajo". */
  low: number;
  /** El techo: pasado él, la zona es "alto". */
  high: number;
  /** El valor que ocupa todo el ancho. Por defecto, un cuarto más que el techo. */
  max?: number;
  /** Cómo se escribe una cifra: "12 kg", "S/ 40". */
  format?: (n: number) => string;
  /** Si se escribe la zona al lado. Sin ella, la cifra va sola (la zona sigue en lo que se oye). */
  showZone?: boolean;
  /** Ancho de la barra. Por defecto ocupa lo que haya. */
  width?: number;
  texts?: Partial<LevelBarTexts>;
  style?: StyleProp<ViewStyle>;
}

export function LevelBar({ value, low, high, max, format = (n) => `${n}`, showZone = true, width, texts, style }: LevelBarProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const tx = { ...TEXTS, ...texts };
  const zone = levelZone(value, low, high);
  const pos = levelPositions(value, low, high, max);
  const color = { empty: t.color.danger.fg, low: t.color.warning.fg, ok: t.color.success.fg, high: t.color.info.fg }[zone];
  const word = tx[zone];
  return (
    <View
      style={[s.row, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={tx.summary(format(value), word, format(low), format(high))}
    >
      <View style={[s.track, width !== undefined ? { width, flexGrow: 0 } : null]}>
        <View style={[s.band, { left: `${pos.low}%`, width: `${Math.max(0, pos.high - pos.low)}%` }]} />
        {pos.fill > 0 ? <View style={[s.fill, { width: `${pos.fill}%`, backgroundColor: color }]} /> : null}
        <View style={[s.tick, { left: `${pos.low}%` }]} />
        <View style={[s.tick, { left: `${pos.high}%` }]} />
      </View>
      <Text style={[textStyle(t, "data"), s.value]} numberOfLines={1}>
        {format(value)}
      </Text>
      {showZone ? (
        <Text style={[textStyle(t, "caption", zone === "ok" ? t.color.text.secondary : color), s.zone]} numberOfLines={1}>
          {`${SIGN[zone]} ${word}`}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: t.space.sm },
    track: {
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 48,
      height: 10,
      borderRadius: t.radius.sm,
      backgroundColor: t.color.bg.muted,
      // El borde separa la pista del fondo cuando la superficie y el muted casi se tocan.
      borderWidth: 1,
      borderColor: t.color.border.default,
      overflow: "hidden",
    },
    band: { position: "absolute", top: 0, bottom: 0, backgroundColor: t.color.border.default },
    fill: { position: "absolute", left: 0, top: 2, bottom: 2, borderRadius: 2 },
    // Las marcas van por encima del relleno: se ve dónde está el piso aunque el valor lo pase.
    tick: { position: "absolute", top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: t.color.text.secondary },
    value: { minWidth: 36, textAlign: "right" },
    zone: { fontWeight: "600" },
  });
