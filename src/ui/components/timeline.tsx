/**
 * El historial de algo: qué pasó, cuándo y quién lo hizo, lo más nuevo
 * arriba.
 *
 * - Cada evento lleva su fecha escrita, no "hace 3 días" solamente: la fecha
 *   relativa se desactualiza en una pantalla abierta y no sirve para
 *   buscar en papeles.
 * - El tono (`success`, `danger`, `warning`) pinta el punto **y** antepone un
 *   signo al título (✓, ✕, !), para que no dependa del color.
 * - Con `limit`, el resto se abre con "Ver N más": un historial de cuarenta
 *   eventos no se lee entero.
 */
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { Button } from "./button";

export type TimelineTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface TimelineEvent {
  key: string;
  /** Ya legible: "14 oct 2026 · 10:30". */
  date: string;
  title: string;
  detail?: string;
  /** Quién lo hizo. */
  author?: string;
  tone?: TimelineTone;
  /** Algo extra debajo del detalle (un `Badge`, un botón). */
  extra?: ReactNode;
}

const SIGNO: Record<TimelineTone, string> = { neutral: "", success: "✓ ", warning: "! ", danger: "✕ ", info: "" };

export function Timeline({
  events,
  limit,
  emptyText = "Todavía no pasó nada.",
  moreLabel = (n: number) => `Ver ${n} más`,
  lessLabel = "Ver menos",
}: {
  events: TimelineEvent[];
  limit?: number;
  emptyText?: string;
  moreLabel?: (n: number) => string;
  lessLabel?: string;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [todos, setTodos] = useState(false);
  if (events.length === 0) return <Text style={textStyle(t, "body", t.color.text.secondary)}>{emptyText}</Text>;
  const visibles = limit && !todos ? events.slice(0, limit) : events;
  const ocultos = events.length - visibles.length;
  const color = (tono: TimelineTone = "neutral") =>
    tono === "neutral" ? t.color.border.strong : tono === "info" ? t.color.accent.base : t.color[tono].fg;

  return (
    <View>
      {visibles.map((ev, i) => (
        <View key={ev.key} style={s.evento}>
          <View style={s.riel}>
            <View style={[s.punto, { backgroundColor: color(ev.tone) }]} />
            {i < visibles.length - 1 ? <View style={s.linea} /> : null}
          </View>
          <View style={s.cuerpo}>
            <Text style={textStyle(t, "caption", t.color.text.secondary)}>
              {ev.date}
              {ev.author ? ` · ${ev.author}` : ""}
            </Text>
            <Text style={[textStyle(t, "body", ev.tone === "danger" ? t.color.danger.fg : t.color.text.primary), s.titulo]}>
              {SIGNO[ev.tone ?? "neutral"]}
              {ev.title}
            </Text>
            {ev.detail ? <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{ev.detail}</Text> : null}
            {ev.extra}
          </View>
        </View>
      ))}
      {ocultos > 0 || (todos && limit && events.length > limit) ? (
        <View style={s.mas}>
          <Button label={todos ? lessLabel : moreLabel(ocultos)} variant="ghost" size="sm" onPress={() => setTodos((v) => !v)} />
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    evento: { flexDirection: "row", gap: t.space.md },
    riel: { width: 12, alignItems: "center" },
    punto: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
    linea: { flex: 1, width: 2, backgroundColor: t.color.border.default, marginVertical: 2 },
    cuerpo: { flex: 1, gap: 2, paddingBottom: t.space.lg },
    titulo: { fontWeight: "600" },
    mas: { flexDirection: "row", paddingLeft: 24 },
  });
