/**
 * La parte de cada cosa en un total, de un vistazo.
 *
 * Sirve **solo con pocas porciones** (hasta seis) y con diferencias que se
 * ven: para comparar valores parecidos, o con muchas categorías, va un
 * ranking de barras. Quien la usa junta la cola en "Otras" antes de pasarla.
 *
 * - El total va en el centro; el porcentaje de cada porción, en la leyenda
 *   de al lado, que además es lo que se toca para elegir.
 * - La mayor arranca a las doce y siguen en el sentido del reloj.
 * - Las porciones se separan con un hueco de superficie, no con un borde.
 * - Lo elegido se despega: sale un poco hacia fuera y el centro dice su
 *   cifra en vez del total. Se elige desde la leyenda, que tiene los cuatro
 *   estados de lo que se toca. El tramo de SVG no es tocable: en la web
 *   React Native SVG no traduce su `onPress` y lo deja como atributo suelto.
 */
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { arcPath, compactNumber } from "./chart-logic";
import { ChartLegend, markOpacity, type SelectableChartProps } from "./chart-parts";

export interface DonutItem {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  items,
  size = 180,
  totalLabel = "Total",
  selected,
  onSelect,
  format = compactNumber,
  accessibilityLabel,
}: SelectableChartProps & { items: DonutItem[]; size?: number; totalLabel?: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const datos = items.filter((i) => i.value > 0);
  const total = datos.reduce((acc, i) => acc + i.value, 0);
  const r = size / 2;
  const grueso = Math.max(18, size * 0.16);
  const pct = (v: number) => (total > 0 ? `${Math.round((v / total) * 100)} %` : "0 %");

  const tramos: { it: DonutItem; a0: number; a1: number }[] = [];
  for (const it of datos) {
    const a0 = tramos.length ? tramos[tramos.length - 1].a1 : 0;
    tramos.push({ it, a0, a1: a0 + (total > 0 ? (it.value / total) * Math.PI * 2 : 0) });
  }
  const foco = datos.find((d) => d.key === selected);

  return (
    <View style={s.bloque} accessibilityLabel={accessibilityLabel}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {tramos.map(({ it, a0, a1 }) => {
            const elegida = selected === it.key;
            // Lo elegido sale hacia fuera: crece el radio, no el color.
            const fuera = elegida ? 0 : 4;
            return (
              <Path
                key={it.key}
                d={arcPath(r, r, r - fuera, r - grueso - fuera, a0, a1, datos.length > 1 ? 1.5 : 0)}
                fill={it.color}
                opacity={markOpacity(selected, it.key)}
              />
            );
          })}
        </Svg>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.centro]}>
          <Text style={textStyle(t, "caption", t.color.text.secondary)} numberOfLines={1}>
            {foco ? foco.label : totalLabel}
          </Text>
          <Text style={[textStyle(t, "subtitle"), s.cifra]} numberOfLines={1}>
            {format(foco ? foco.value : total)}
          </Text>
          {foco ? <Text style={textStyle(t, "caption", t.color.text.secondary)}>{pct(foco.value)}</Text> : null}
        </View>
      </View>
      <View style={s.leyenda}>
        <ChartLegend
          items={datos.map((d) => ({ key: d.key, label: d.label, color: d.color, value: pct(d.value) }))}
          selected={selected}
          onSelect={onSelect}
        />
      </View>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    bloque: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.lg },
    centro: { alignItems: "center", justifyContent: "center", paddingHorizontal: "22%" },
    cifra: { fontWeight: "700" },
    leyenda: { flex: 1, minWidth: 180 },
  });
