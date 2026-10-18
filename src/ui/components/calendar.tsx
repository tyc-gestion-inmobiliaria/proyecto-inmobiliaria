/**
 * Un calendario para elegir un día o un rango, sin librería.
 *
 * - **Rango:** el primer toque pone el inicio, el segundo el fin, y lo de en
 *   medio se pinta como tramo. Mientras hay un rango a medias se marca solo
 *   el día tocado: pintar el tramo viejo hace creer que sigue vigente.
 * - **Dos meses a la vista** por defecto, porque casi todos los rangos cruzan
 *   el cambio de mes y con uno solo hay que navegar y perder de vista el
 *   inicio.
 * - **Los extremos son los únicos llenos** y además llevan letra gruesa; el
 *   tramo va teñido. Hoy se subraya en vez de pintarse, para no competir con
 *   los extremos.
 * - Cada celda mide 44: es lo mínimo tocable.
 */
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { addMonths, daysOfMonth, isInside, isoDate, orderRange, parseYearMonth, todayIso, type YearMonth } from "./calendar-logic";

const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS_ES_MONDAY = ["L", "M", "X", "J", "V", "S", "D"];

export interface CalendarTexts {
  monthNames: string[];
  /** Siete letras, empezando por el día de `weekStartsOn`. */
  weekdays: string[];
  previous: string;
  next: string;
  hintStart: string;
  hintEnd: (from: string) => string;
  dayLabel: (day: number, monthName: string, year: number) => string;
}

const defaultTexts: CalendarTexts = {
  monthNames: MONTHS_ES,
  weekdays: WEEKDAYS_ES_MONDAY,
  previous: "Mes anterior",
  next: "Mes siguiente",
  hintStart: "Toca el primer día",
  hintEnd: (from) => `Desde ${from} · toca el último día`,
  dayLabel: (d, m, y) => `${d} de ${m} de ${y}`,
};

export interface CalendarProps {
  mode?: "single" | "range";
  /** Inicio del rango, o el día elegido en modo `single`. `AAAA-MM-DD`. */
  from?: string;
  to?: string;
  /** Avisa cuando hay algo completo: en rango, con los dos extremos. */
  onChange: (value: { from: string; to: string }) => void;
  months?: 1 | 2;
  min?: string;
  max?: string;
  /** Inyectable para pruebas y para el día de negocio de cada proyecto. */
  today?: string;
  weekStartsOn?: 0 | 1;
  texts?: Partial<CalendarTexts>;
}

export function Calendar({
  mode = "range",
  from,
  to,
  onChange,
  months = 2,
  min,
  max,
  today = todayIso(),
  weekStartsOn = 1,
  texts,
}: CalendarProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const tx = { ...defaultTexts, ...texts };
  // Se abre en el mes de lo elegido, no en el de hoy.
  const [anchor, setAnchor] = useState<YearMonth>(() => parseYearMonth(from ?? today));
  const [pending, setPending] = useState<string | null>(null);

  function tap(date: string) {
    if (mode === "single") return onChange({ from: date, to: date });
    if (pending === null) return setPending(date);
    setPending(null);
    onChange(orderRange(pending, date));
  }

  const shown = Array.from({ length: months }, (_, i) => addMonths(anchor, i));

  return (
    <View style={s.box}>
      <View style={s.bar}>
        <MonthArrow label={tx.previous} sign="‹" onPress={() => setAnchor((a) => addMonths(a, -1))} />
        <Text style={[textStyle(t, "bodySmall", t.color.text.secondary), s.hint]} accessibilityLiveRegion="polite">
          {mode === "range" ? (pending === null ? tx.hintStart : tx.hintEnd(pending)) : ""}
        </Text>
        <MonthArrow label={tx.next} sign="›" onPress={() => setAnchor((a) => addMonths(a, 1))} />
      </View>
      <View style={s.months}>
        {shown.map((ym) => (
          <Month
            key={`${ym.year}-${ym.month}`}
            ym={ym}
            from={from}
            to={mode === "single" ? from : to}
            pending={pending}
            today={today}
            min={min}
            max={max}
            weekStartsOn={weekStartsOn}
            texts={tx}
            onTap={tap}
          />
        ))}
      </View>
    </View>
  );
}

function MonthArrow({ label, sign, onPress }: { label: string; sign: string; onPress: () => void }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={(state: EstadoPresionable) => {
        const i = resolveInteraction(state);
        return [s.arrow, i === "hovered" && s.arrowHovered, i === "pressed" && s.arrowPressed];
      }}
    >
      <Text style={textStyle(t, "subtitle")}>{sign}</Text>
    </Pressable>
  );
}

function Month({
  ym,
  from,
  to,
  pending,
  today,
  min,
  max,
  weekStartsOn,
  texts,
  onTap,
}: {
  ym: YearMonth;
  from?: string;
  to?: string;
  pending: string | null;
  today: string;
  min?: string;
  max?: string;
  weekStartsOn: 0 | 1;
  texts: CalendarTexts;
  onTap: (date: string) => void;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const cells = useMemo(() => daysOfMonth(ym.year, ym.month, weekStartsOn), [ym.year, ym.month, weekStartsOn]);
  const monthName = texts.monthNames[ym.month];

  return (
    <View style={s.month}>
      <Text style={[textStyle(t, "subtitle"), s.monthTitle]}>
        {monthName} {ym.year}
      </Text>
      <View style={s.week}>
        {texts.weekdays.map((d, i) => (
          <Text key={`${d}-${i}`} style={[textStyle(t, "caption", t.color.text.tertiary), s.weekday]}>
            {d}
          </Text>
        ))}
      </View>
      <View style={s.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={`gap-${i}`} style={s.cell} />;
          const date = isoDate(ym.year, ym.month, day);
          const isStart = pending !== null ? date === pending : date === from;
          const isEnd = pending !== null ? false : date === to;
          const edge = isStart || isEnd;
          const inRange = pending === null && from !== undefined && to !== undefined && date > from && date < to;
          const disabled = !isInside(date, min, max);
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityLabel={texts.dayLabel(day, monthName, ym.year)}
              accessibilityState={{ selected: edge, disabled }}
              disabled={disabled}
              onPress={() => onTap(date)}
              style={(state: EstadoPresionable) => {
                const it = resolveInteraction(state, { selected: edge, disabled });
                return [
                  s.cell,
                  s.cellPressable,
                  inRange && s.cellRange,
                  it === "hovered" && s.cellHovered,
                  it === "pressed" && s.cellPressed,
                  it === "selected" && s.cellEdge,
                  disabled && s.cellDisabled,
                ];
              }}
            >
              <Text
                style={[
                  textStyle(t, "data"),
                  date === today && s.today,
                  edge && { color: t.color.text.onAccent, fontWeight: "700" },
                  disabled && { color: t.color.text.disabled },
                ]}
              >
                {day}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const CELL = 44;

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    box: { padding: t.space.md, gap: t.space.md },
    bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: t.space.sm },
    hint: { flex: 1, textAlign: "center" },
    arrow: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: t.color.border.strong,
      borderRadius: t.radius.sm,
      cursor: "pointer",
    },
    arrowHovered: { borderColor: t.color.border.focus, backgroundColor: t.color.bg.hover },
    arrowPressed: { borderColor: t.color.border.focus, backgroundColor: t.color.bg.pressed },
    months: { flexDirection: "row", flexWrap: "wrap", gap: t.space.xl },
    month: { gap: t.space.xs + 2 },
    monthTitle: { textTransform: "capitalize" },
    week: { flexDirection: "row" },
    weekday: { width: CELL, textAlign: "center" },
    grid: { flexDirection: "row", flexWrap: "wrap", width: CELL * 7 },
    cell: { width: CELL, height: CELL, alignItems: "center", justifyContent: "center" },
    cellPressable: { borderRadius: t.radius.sm, cursor: "pointer" },
    cellRange: { backgroundColor: t.color.accent.subtle, borderRadius: 0 },
    cellHovered: { backgroundColor: t.color.bg.hover },
    cellPressed: { backgroundColor: t.color.bg.pressed },
    cellEdge: { backgroundColor: t.color.accent.base },
    cellDisabled: { cursor: "auto" },
    today: { textDecorationLine: "underline", fontWeight: "600" },
  });
