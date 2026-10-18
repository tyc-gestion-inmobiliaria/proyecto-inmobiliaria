/**
 * La ficha de un indicador: qué es, la cifra, cuánto cambió y una línea
 * chiquita con la tendencia.
 *
 * Cuando el dato es un solo número, **el número es la gráfica**: una barra
 * sola o una dona de dos porciones dicen menos que la cifra bien puesta.
 *
 * - **El cambio dice si es bueno, no solo si sube.** Un gasto que sube es
 *   malo; un ingreso que sube, bueno. Por eso se pasa `goodWhen`.
 * - El cambio lleva **▲ o ▼ y su palabra**, además del color.
 * - La cifra grande va con números proporcionales, no tabulares: los
 *   tabulares dejan huecos raros en un número suelto a ese tamaño.
 */
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { FitNumber } from "../components/fit-number";
import { Card } from "../components/surfaces";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { linePath, scaleLinear } from "./chart-logic";
import { useMeasuredWidth } from "./chart-parts";

/** Una línea mínima, sin ejes: la forma de la tendencia y nada más. */
export function Sparkline({ values, color, height = 32, accessibilityLabel }: { values: number[]; color?: string; height?: number; accessibilityLabel?: string }) {
  const t = useTheme();
  const [width, onLayout] = useMeasuredWidth();
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const x = scaleLinear([0, Math.max(1, values.length - 1)], [2, width - 2]);
  const y = scaleLinear([min, max], [height - 3, 3]);
  const trazo = color ?? t.color.chart.series[0];
  return (
    <View style={{ height }} onLayout={onLayout} accessibilityLabel={accessibilityLabel}>
      {width > 0 && values.length > 1 ? (
        <Svg width={width} height={height}>
          <Path d={linePath(values.map((v, i) => ({ x: x(i), y: y(v) })))} stroke={trazo} strokeWidth={2} fill="none" />
        </Svg>
      ) : null}
    </View>
  );
}

export interface StatDelta {
  /** El cambio relativo, en %, contra el periodo de comparación. `null` si no hay base. */
  percent: number | null;
  /** Si subir es bueno (ingresos) o malo (gastos). */
  goodWhen: "up" | "down";
  /** Contra qué se compara: "vs. periodo anterior". */
  label: string;
}

export function StatTile({
  label,
  value,
  delta,
  spark,
  sparkColor,
  emphasis = false,
}: {
  label: string;
  value: string;
  delta?: StatDelta;
  spark?: number[];
  sparkColor?: string;
  /** La cifra que encabeza el tablero: más grande. */
  emphasis?: boolean;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  let cambio: { texto: string; color: string } | null = null;
  if (delta) {
    if (delta.percent === null || !Number.isFinite(delta.percent)) {
      cambio = { texto: `sin base ${delta.label}`, color: t.color.text.secondary };
    } else {
      const p = Math.round(delta.percent);
      const sube = p > 0;
      const bueno = p === 0 ? null : sube === (delta.goodWhen === "up");
      cambio = {
        texto: p === 0 ? `igual ${delta.label}` : `${sube ? "▲" : "▼"} ${Math.abs(p) > 999 ? ">999" : Math.abs(p)} % ${delta.label}`,
        color: bueno === null ? t.color.text.secondary : bueno ? t.color.success.fg : t.color.danger.fg,
      };
    }
  }
  return (
    <Card style={s.ficha}>
      <Text style={textStyle(t, "bodySmall", t.color.text.secondary)} numberOfLines={1}>
        {label}
      </Text>
      {/* La cifra encoge hasta caber: `adjustsFontSizeToFit` no existe en la web y la cortaba en "US$ 29,…". */}
      <FitNumber size={t.typography.scale[emphasis ? "display" : "title"].fontSize} min={16} style={[textStyle(t, emphasis ? "display" : "title"), s.cifra]}>
        {value}
      </FitNumber>
      {cambio ? <Text style={textStyle(t, "caption", cambio.color)}>{cambio.texto}</Text> : null}
      {spark && spark.length > 1 ? <Sparkline values={spark} color={sparkColor} /> : null}
    </Card>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    ficha: { flexGrow: 1, flexBasis: 170, minWidth: 0, gap: t.space.xs },
    cifra: { fontVariant: ["proportional-nums"] },
  });
