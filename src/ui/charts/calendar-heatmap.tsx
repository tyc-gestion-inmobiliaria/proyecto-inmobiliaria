/**
 * Un calendario de calor: un cuadro por día, más oscuro cuanto más.
 *
 * Deja ver patrones que una línea esconde: los lunes caros, la quincena, la
 * semana que se disparó. Columnas por semana, filas por día de la semana
 * (lunes arriba), y un solo tono de claro a oscuro. Un día sin nada queda en
 * el gris de "nada", no en el paso más claro: cero no es "poco".
 *
 * Debajo, la escala con "menos" y "más", que es la que da sentido al tono.
 *
 * **Dos formas según el largo.** Hasta seis semanas se dibuja como el
 * calendario de pared que todos conocen —semanas en filas, el número del día
 * dentro, celdas de 44—; con más, como tira de semanas en columnas (la forma
 * de un año entero), con celdas chicas pegadas.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { compactNumber, sequentialStep } from "./chart-logic";
import { ChartTooltip, toggleSelection, useHoveredMark, useMeasuredWidth, type SelectableChartProps } from "./chart-parts";

export interface CalendarDay {
  /** `AAAA-MM-DD`. */
  date: string;
  value: number;
}

const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
const DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function diaDeSemana(fecha: string): number {
  // 0 = lunes.
  return (new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7;
}

export function CalendarHeatmap({
  days,
  selected,
  onSelect,
  format = compactNumber,
  accessibilityLabel,
  lessLabel = "Menos",
  moreLabel = "Más",
}: SelectableChartProps & { days: CalendarDay[]; lessLabel?: string; moreLabel?: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [width, onLayout] = useMeasuredWidth();
  const { hovered, bind } = useHoveredMark();
  const ramp = t.color.chart.sequential;
  const max = Math.max(0, ...days.map((d) => d.value));

  // Columnas de semana: la primera arranca en el lunes de la semana del primer día.
  const semanas: (CalendarDay | null)[][] = [];
  if (days.length) {
    let semana: (CalendarDay | null)[] = Array.from({ length: diaDeSemana(days[0].date) }, () => null);
    for (const d of days) {
      semana.push(d);
      if (semana.length === 7) {
        semanas.push(semana);
        semana = [];
      }
    }
    if (semana.length) semanas.push([...semana, ...Array.from({ length: 7 - semana.length }, () => null)]);
  }
  const ROTULO = 18;
  const mes = semanas.length > 0 && semanas.length <= 6;
  // En forma de mes, siete columnas que llenan el ancho, de 44 a 64.
  const celdaMes = Math.max(44, Math.min(64, Math.floor((width - 6 * 4) / 7)));
  const celda = Math.max(14, Math.min(34, Math.floor((width - ROTULO) / Math.max(1, semanas.length)) - 3));
  const pos = (fecha: string) => {
    for (let c = 0; c < semanas.length; c++) {
      const f = semanas[c].findIndex((d) => d?.date === fecha);
      if (f >= 0) return { c, f };
    }
    return null;
  };
  const enHover = hovered ? days.find((d) => d.date === hovered) : undefined;
  const p = enHover ? pos(enHover.date) : null;
  const tinta = (color: string) => {
    const i = ramp.indexOf(color);
    return i >= (t.scheme === "light" ? 4 : 3) ? t.color.text.onAccent : t.color.text.primary;
  };
  const etiquetaDe = (fecha: string) => {
    const [, m, d] = fecha.split("-").map(Number);
    return `${DIAS_LARGOS[diaDeSemana(fecha)]} ${d} ${MESES[m - 1]}`;
  };

  const celdaTocable = (d: CalendarDay, ancho: number, conNumero: boolean) => {
    const color = sequentialStep(ramp, d.value, max) ?? t.color.chart.neutral;
    const elegido = selected === d.date;
    return (
      <Pressable
        key={d.date}
        accessibilityRole="button"
        accessibilityLabel={`${etiquetaDe(d.date)}: ${format(d.value)}`}
        accessibilityState={{ selected: elegido }}
        onPress={onSelect ? () => onSelect(toggleSelection(selected, d.date)) : undefined}
        {...bind(d.date)}
        style={(estado: EstadoPresionable) => {
          const it = resolveInteraction(estado, { selected: elegido });
          return [
            s.celda,
            { width: ancho, height: conNumero ? 44 : ancho, backgroundColor: color },
            it === "hovered" && s.celdaEncima,
            it === "pressed" && s.celdaPresionada,
            it === "selected" && s.celdaElegida,
          ];
        }}
      >
        {conNumero ? (
          <Text style={[textStyle(t, "caption", tinta(color)), elegido && s.negrita]}>
            {elegido ? "✓ " : ""}
            {Number(d.date.slice(8, 10))}
          </Text>
        ) : elegido ? (
          <Text style={[s.marca, { color: t.color.bg.surface }]}>✓</Text>
        ) : null}
      </Pressable>
    );
  };

  if (mes) {
    const iFila = enHover ? semanas.findIndex((sem) => sem.some((d) => d?.date === enHover.date)) : -1;
    const iCol = enHover && iFila >= 0 ? semanas[iFila].findIndex((d) => d?.date === enHover.date) : -1;
    return (
      <View style={s.bloque} onLayout={onLayout} accessibilityLabel={accessibilityLabel}>
        <View style={s.mesFila}>
          {DIAS.map((d, i) => (
            <Text key={i} style={[textStyle(t, "caption", t.color.text.tertiary), { width: celdaMes, textAlign: "center" }]}>
              {d}
            </Text>
          ))}
        </View>
        {semanas.map((sem, f) => (
          <View key={f} style={s.mesFila}>
            {sem.map((d, c) => (d ? celdaTocable(d, celdaMes, true) : <View key={`v${c}`} style={{ width: celdaMes, height: 44 }} />))}
          </View>
        ))}
        <Escala />
        {enHover && iFila >= 0 ? (
          <ChartTooltip
            x={iCol * (celdaMes + 4) + celdaMes / 2}
            y={(iFila + 1) * 48 + 24}
            containerWidth={width}
            title={etiquetaDe(enHover.date)}
            rows={[{ label: "", value: format(enHover.value) }]}
          />
        ) : null}
      </View>
    );
  }

  function Escala() {
    return (
      <View style={s.escala}>
        <Text style={textStyle(t, "caption", t.color.text.secondary)}>{lessLabel}</Text>
        <View style={[s.paso, { backgroundColor: t.color.chart.neutral }]} />
        {ramp.map((c) => (
          <View key={c} style={[s.paso, { backgroundColor: c }]} />
        ))}
        <Text style={textStyle(t, "caption", t.color.text.secondary)}>{moreLabel}</Text>
      </View>
    );
  }

  return (
    <View style={s.bloque} onLayout={onLayout} accessibilityLabel={accessibilityLabel}>
      <ScrollView horizontal>
        <View style={s.rejilla}>
          <View style={[s.rotulos, { width: ROTULO }]}>
            {DIAS.map((d, i) => (
              <Text key={i} style={[textStyle(t, "caption", t.color.text.tertiary), { height: celda + 3, lineHeight: celda + 3 }]}>
                {i % 2 === 0 ? d : ""}
              </Text>
            ))}
          </View>
          {semanas.map((sem, c) => (
            <View key={c} style={s.semana}>
              {sem.map((d, f) => (d ? celdaTocable(d, celda, false) : <View key={f} style={{ width: celda, height: celda }} />))}
            </View>
          ))}
        </View>
      </ScrollView>
      <Escala />
      {enHover && p ? (
        <ChartTooltip
          x={ROTULO + p.c * (celda + 3) + celda / 2}
          y={(p.f + 1) * (celda + 3) + 4}
          containerWidth={width}
          title={etiquetaDe(enHover.date)}
          rows={[{ label: "", value: format(enHover.value) }]}
        />
      ) : null}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    bloque: { gap: t.space.sm },
    rejilla: { flexDirection: "row", gap: 3 },
    rotulos: {},
    semana: { gap: 3 },
    celda: { borderRadius: 3, borderWidth: 2, borderColor: "transparent", alignItems: "center", justifyContent: "center", cursor: "pointer" },
    celdaEncima: { borderColor: t.color.border.strong },
    celdaPresionada: { opacity: 0.7 },
    celdaElegida: { borderColor: t.color.border.focus },
    marca: { fontSize: 11, fontWeight: "700" },
    negrita: { fontWeight: "700" },
    mesFila: { flexDirection: "row", gap: 4 },
    escala: { flexDirection: "row", alignItems: "center", gap: 3 },
    paso: { width: 14, height: 14, borderRadius: 2 },
  });
