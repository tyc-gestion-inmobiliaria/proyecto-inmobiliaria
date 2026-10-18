/**
 * Una agenda por columnas: el día de varias personas, salas o equipos lado a
 * lado, o la semana de uno solo con un día por columna. Las horas bajan por
 * el costado.
 *
 * - **Lo libre se toca.** Cada franja abierta y sin nada encima es un botón
 *   con sus cuatro estados: en reposo dice su hora, encima dice "+ hora",
 *   presionada se hunde y elegida lleva ✓ y borde de 2. Lo que está fuera de
 *   horario se pinta apagado y no se toca.
 * - **Lo que ocupa** (`items`) va encima, con su palabra de estado además del
 *   color. Lo que ya no ocupa (una cita cancelada) no se pasa: taparía el
 *   hueco libre que dejó. Un `block` (un descanso, unas vacaciones) se ve rayado y no
 *   cuenta como cita. Si dos cosas se cruzan en la misma columna, se reparten
 *   el ancho en vez de taparse.
 * - **La franja mide al menos 44** de alto (`slotHeight`, 48 por defecto):
 *   lo que se toca no baja del mínimo aunque la agenda se alargue. Si un
 *   ítem dura menos que `step`, conviene bajar `step` a esa duración.
 * - **No se arrastra**, como `Board`: mover una cita es cosa de la pantalla.
 * - Con `maxHeight` las horas se desplazan bajo la cabecera, que queda fija,
 *   y la agenda arranca mostrando `now` si cae dentro.
 */
import { useEffect, useMemo, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable, type ForcedInteraction } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { buildSlots, hourMarks, layoutLanes, minuteLabel, minuteToY, type ScheduleRange } from "./schedule-logic";
import type { StatusTone } from "./surfaces";

export interface ScheduleColumn {
  key: string;
  label: string;
  /** Una línea debajo del nombre: "62 % ocupado", "Libre". */
  detail?: string;
  /** Los tramos abiertos. Sin esto, toda la columna está abierta; con `[]`, ninguna. */
  open?: ScheduleRange[];
}

export interface ScheduleItem extends ScheduleRange {
  key: string;
  column: string;
  title: string;
  detail?: string;
  /** La palabra del estado: va siempre junto al color. */
  status?: string;
  tone?: StatusTone;
  /** Un rato no disponible (descanso, vacaciones): rayado, no es una cita. */
  kind?: "event" | "block";
}

export interface ScheduleGridTexts {
  /** Lo que se oye en una franja libre. */
  free: (column: string, time: string) => string;
  /** Lo que se ve encima de una franja libre. */
  freeHover: (time: string) => string;
  now: string;
}

const defaultTexts: ScheduleGridTexts = {
  free: (column, time) => `${column}, libre a las ${time}`,
  freeHover: (time) => `+ ${time}`,
  now: "Ahora",
};

export interface ScheduleGridProps {
  columns: ScheduleColumn[];
  items: ScheduleItem[];
  /** Minuto en que empieza la vista (480 = 08:00). */
  start: number;
  end: number;
  /** Cada cuántos minutos hay una franja tocable. */
  step?: number;
  /** Alto de una franja. No baja de 44. */
  slotHeight?: number;
  columnMinWidth?: number;
  /** Alto máximo: con esto, las horas se desplazan bajo la cabecera fija. */
  maxHeight?: number;
  /** El minuto actual, si lo que se ve incluye hoy: dibuja la línea de "Ahora". */
  now?: number;
  /** En una semana, la columna de hoy: la línea cruza solo esa. Sin esto, cruza todas. */
  nowColumn?: string;
  onPressItem?: (key: string) => void;
  onPressSlot?: (column: string, start: number) => void;
  selectedItem?: string | null;
  selectedSlot?: { column: string; start: number } | null;
  accessibilityLabel: string;
  texts?: Partial<ScheduleGridTexts>;
  /** Solo para vitrina, Storybook y Figma: pinta la primera franja libre y el primer ítem en este estado. */
  forcedState?: ForcedInteraction;
}

const GUTTER = 56;

export function ScheduleGrid({
  columns,
  items,
  start,
  end,
  step = 30,
  slotHeight = 48,
  columnMinWidth = 168,
  maxHeight,
  now,
  nowColumn,
  onPressItem,
  onPressSlot,
  selectedItem,
  selectedSlot,
  accessibilityLabel,
  texts,
  forcedState,
}: ScheduleGridProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const tx = { ...defaultTexts, ...texts };
  const alto = Math.max(slotHeight, t.minTouch);
  const total = minuteToY(end, start, step, alto);
  const body = useRef<ScrollView>(null);
  const nowInside = now !== undefined && now >= start && now <= end;

  // Arranca mostrando la hora actual, con una hora de margen arriba.
  useEffect(() => {
    if (maxHeight && nowInside) body.current?.scrollTo({ y: Math.max(0, minuteToY(now! - 60, start, step, alto)), animated: false });
    // Solo al montar y al cambiar de día: seguir el reloj movería la vista bajo el dedo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxHeight, start, columns.map((c) => c.key).join("|")]);

  const porColumna = useMemo(() => {
    const m = new Map<string, ScheduleItem[]>();
    for (const c of columns) m.set(c.key, []);
    for (const it of items) m.get(it.column)?.push(it);
    return m;
  }, [columns, items]);

  const primeraLibre = useMemo(() => {
    for (const c of columns) {
      const libre = buildSlots(start, end, step, c.open, porColumna.get(c.key) ?? []).find((x) => x.state === "free");
      if (libre) return `${c.key}|${libre.start}`;
    }
    return null;
  }, [columns, porColumna, start, end, step]);

  const minWidth = GUTTER + columns.length * columnMinWidth;

  const cabecera = (
    <View style={[s.fila, s.cabecera]}>
      <View style={s.gutter} />
      {columns.map((c) => (
        <View key={c.key} style={[s.columna, { minWidth: columnMinWidth }, s.cabeceraCelda]}>
          <Text style={[textStyle(t, "bodySmall"), s.negrita]} numberOfLines={1} accessibilityRole="header">
            {c.label}
          </Text>
          {c.detail ? (
            <Text style={textStyle(t, "caption", t.color.text.secondary)} numberOfLines={1}>
              {c.detail}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );

  const cuerpo = (
    <View style={[s.fila, { height: total }]}>
      <View style={[s.gutter, { height: total }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {hourMarks(start, end).map((m) => (
          <Text key={m} style={[textStyle(t, "caption", t.color.text.secondary), s.hora, { top: Math.max(0, minuteToY(m, start, step, alto) - 8) }]}>
            {minuteLabel(m)}
          </Text>
        ))}
      </View>
      {columns.map((c) => {
        const propios = porColumna.get(c.key) ?? [];
        const franjas = buildSlots(start, end, step, c.open, propios);
        const carriles = layoutLanes(propios);
        return (
          <View key={c.key} style={[s.columna, { minWidth: columnMinWidth, height: total }]}>
            {franjas.map((f) => {
              const top = minuteToY(f.start, start, step, alto);
              const enPunto = f.start % 60 === 0;
              if (f.state !== "free" || !onPressSlot) {
                return <View key={f.start} style={[s.franja, enPunto && s.franjaEnPunto, f.state === "closed" && s.cerrada, { top, height: alto }]} />;
              }
              const elegida = selectedSlot?.column === c.key && selectedSlot.start === f.start;
              const forzada = `${c.key}|${f.start}` === primeraLibre ? forcedState : undefined;
              const hora = minuteLabel(f.start);
              return (
                <Pressable
                  key={f.start}
                  accessibilityRole="button"
                  accessibilityLabel={tx.free(c.label, hora)}
                  accessibilityState={{ selected: elegida }}
                  onPress={() => onPressSlot(c.key, f.start)}
                  style={(e: EstadoPresionable) => {
                    const i = resolveInteraction(e, { selected: elegida, forced: forzada });
                    return [
                      s.franja,
                      s.libre,
                      enPunto && s.franjaEnPunto,
                      { top, height: alto },
                      i === "hovered" && s.libreEncima,
                      i === "pressed" && s.librePresionada,
                      i === "selected" && s.libreElegida,
                    ];
                  }}
                >
                  {(e: EstadoPresionable) => {
                    const i = resolveInteraction(e, { selected: elegida, forced: forzada });
                    return (
                      <Text
                        style={[
                          textStyle(t, "caption", i === "rest" ? t.color.text.tertiary : t.color.accent.text),
                          (i === "selected" || i === "pressed") && s.negrita,
                        ]}
                      >
                        {i === "selected" ? `✓ ${hora}` : i === "rest" ? hora : tx.freeHover(hora)}
                      </Text>
                    );
                  }}
                </Pressable>
              );
            })}
            {propios.map((it, idx) => {
              const carril = carriles.get(it.key) ?? { lane: 0, lanes: 1 };
              const top = minuteToY(Math.max(it.start, start), start, step, alto);
              const height = Math.max(20, minuteToY(Math.min(it.end, end), start, step, alto) - top);
              const ancho = 100 / carril.lanes;
              const forzado = idx === 0 && c.key === columns[0]?.key ? forcedState : undefined;
              return (
                <Bloque
                  key={it.key}
                  item={it}
                  style={{ top: top + 1, height: height - 2, left: `${carril.lane * ancho}%`, width: `${ancho}%` }}
                  lineas={Math.max(1, Math.floor((height - 8) / 16))}
                  selected={selectedItem === it.key}
                  onPress={onPressItem ? () => onPressItem(it.key) : undefined}
                  forcedState={forzado}
                />
              );
            })}
            {nowInside && nowColumn === c.key ? (
              <View pointerEvents="none" style={[s.ahoraLinea, s.ahoraEnColumna, { top: minuteToY(now!, start, step, alto) - 1 }]} />
            ) : null}
          </View>
        );
      })}
      {nowInside ? (
        <View pointerEvents="none" style={[s.ahora, { top: minuteToY(now!, start, step, alto) }]} accessibilityLabel={`${tx.now}: ${minuteLabel(now!)}`}>
          <Text style={[textStyle(t, "caption", t.color.bg.surface), s.ahoraEtiqueta]}>{minuteLabel(now!)}</Text>
          {nowColumn === undefined ? <View style={s.ahoraLinea} /> : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={s.marco} accessibilityLabel={accessibilityLabel}>
      <ScrollView horizontal contentContainerStyle={s.desliz} showsHorizontalScrollIndicator>
        <View style={[s.interior, { minWidth }]}>
          {cabecera}
          {maxHeight ? (
            <ScrollView ref={body} style={{ maxHeight }} showsVerticalScrollIndicator nestedScrollEnabled>
              {cuerpo}
            </ScrollView>
          ) : (
            cuerpo
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/** Una cita o un bloqueo, puesto en su lugar. */
function Bloque({
  item,
  style,
  lineas,
  selected,
  onPress,
  forcedState,
}: {
  item: ScheduleItem;
  style: { top: number; height: number; left: `${number}%`; width: `${number}%` };
  /** Cuántas líneas de texto caben. El estado va siempre: con poco alto, comparte línea con el título. */
  lineas: number;
  selected: boolean;
  onPress?: () => void;
  forcedState?: ForcedInteraction;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const tono = item.tone ?? "neutral";
  const fg = tono === "neutral" ? t.color.text.secondary : t.color[tono].fg;
  const bloqueo = item.kind === "block";
  const base = [
    s.bloque,
    style,
    bloqueo ? s.bloqueo : { backgroundColor: tono === "neutral" ? t.color.bg.muted : t.color[tono].bg, borderLeftColor: fg },
  ];
  const estado = item.status ? (
    <View style={s.estado}>
      <View style={[s.punto, { backgroundColor: fg }]} />
      <Text style={[textStyle(t, "caption", fg), s.encoger]} numberOfLines={1}>
        {item.status}
      </Text>
    </View>
  ) : null;
  const titulo = (
    <Text
      style={[textStyle(t, "caption", bloqueo ? t.color.text.secondary : t.color.text.primary), s.negrita, lineas === 1 && s.encoger]}
      numberOfLines={lineas >= 4 ? 2 : 1}
    >
      {selected ? `✓ ${item.title}` : item.title}
    </Text>
  );
  const contenido =
    lineas === 1 ? (
      <View style={s.enLinea}>
        {titulo}
        {estado}
      </View>
    ) : (
      <>
        {titulo}
        {lineas >= 3 && item.detail ? (
          <Text style={textStyle(t, "caption", t.color.text.secondary)} numberOfLines={1}>
            {item.detail}
          </Text>
        ) : null}
        {estado ?? (lineas >= 2 && item.detail && lineas < 3 ? (
          <Text style={textStyle(t, "caption", t.color.text.secondary)} numberOfLines={1}>
            {item.detail}
          </Text>
        ) : null)}
      </>
    );
  const etiqueta = [item.title, item.detail, item.status, `${minuteLabel(item.start)} a ${minuteLabel(item.end)}`].filter(Boolean).join(", ");
  if (!onPress) {
    return (
      <View style={base} accessibilityLabel={etiqueta}>
        {contenido}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={(e: EstadoPresionable) => {
        const i = resolveInteraction(e, { selected, forced: forcedState });
        return [...base, s.tocable, i === "hovered" && s.bloqueEncima, i === "pressed" && s.bloquePresionado, i === "selected" && s.bloqueElegido];
      }}
    >
      {contenido}
    </Pressable>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    marco: {
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: t.radius.md,
      backgroundColor: t.color.bg.surface,
      overflow: "hidden",
    },
    desliz: { flexGrow: 1 },
    interior: { flexGrow: 1 },
    fila: { flexDirection: "row", position: "relative" },
    cabecera: { borderBottomWidth: 1, borderBottomColor: t.color.border.default, backgroundColor: t.color.bg.muted },
    cabeceraCelda: { paddingHorizontal: t.space.sm, paddingVertical: t.space.sm, justifyContent: "center", minHeight: t.minTouch + 8 },
    gutter: { width: GUTTER, position: "relative" },
    hora: { position: "absolute", right: t.space.sm },
    columna: { flex: 1, flexBasis: 0, position: "relative", borderLeftWidth: 1, borderLeftColor: t.color.border.subtle },
    franja: {
      position: "absolute",
      left: 0,
      right: 0,
      borderTopWidth: 1,
      borderTopColor: t.color.border.subtle,
      paddingHorizontal: t.space.sm,
      justifyContent: "center",
    },
    franjaEnPunto: { borderTopColor: t.color.border.default },
    cerrada: { backgroundColor: t.color.bg.muted },
    libre: { cursor: "pointer", backgroundColor: t.color.bg.surface },
    libreEncima: { backgroundColor: t.color.bg.hover },
    librePresionada: { backgroundColor: t.color.bg.pressed },
    libreElegida: {
      backgroundColor: t.color.accent.subtle,
      borderWidth: 2,
      borderTopWidth: 2,
      borderColor: t.color.accent.base,
      borderTopColor: t.color.accent.base,
      paddingHorizontal: t.space.sm - 2,
    },
    bloque: {
      position: "absolute",
      paddingHorizontal: t.space.sm,
      paddingVertical: t.space.xxs + 1,
      borderRadius: t.radius.sm,
      borderLeftWidth: 3,
      overflow: "hidden",
      gap: 1,
    },
    bloqueo: {
      backgroundColor: t.color.bg.disabled,
      borderLeftColor: t.color.border.strong,
      borderWidth: 1,
      borderLeftWidth: 3,
      borderStyle: "dashed",
      borderColor: t.color.border.strong,
    },
    tocable: { cursor: "pointer" },
    bloqueEncima: { borderWidth: 1, borderLeftWidth: 3, borderColor: t.color.border.focus },
    bloquePresionado: { borderWidth: 1, borderLeftWidth: 3, borderColor: t.color.border.focus, opacity: 0.8 },
    bloqueElegido: { borderWidth: 2, borderLeftWidth: 3, borderColor: t.color.accent.base },
    estado: { flexDirection: "row", alignItems: "center", gap: t.space.xs, minWidth: 0 },
    enLinea: { flexDirection: "row", alignItems: "center", gap: t.space.sm, minWidth: 0 },
    encoger: { flexShrink: 1 },
    punto: { width: 7, height: 7, borderRadius: 4 },
    negrita: { fontWeight: "600" },
    ahora: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center", marginTop: -9 },
    ahoraEtiqueta: {
      width: GUTTER - 4,
      textAlign: "center",
      backgroundColor: t.color.danger.fg,
      borderRadius: t.radius.sm,
      paddingVertical: 1,
      fontWeight: "600",
    },
    ahoraLinea: { flex: 1, height: 2, backgroundColor: t.color.danger.fg },
    ahoraEnColumna: { position: "absolute", left: 0, right: 0 },
  });
