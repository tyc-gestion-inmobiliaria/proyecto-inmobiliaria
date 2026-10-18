/**
 * Lo que comparten todas las gráficas: el ancho medido, la ayuda emergente,
 * la leyenda que filtra, la tarjeta con su vista de tabla y cómo se marca lo
 * elegido.
 *
 * ## Lo elegido se marca por sí mismo
 *
 * Viene de la app de Ysique, donde se aprendió por las malas: marcar lo
 * elegido **solo apagando a los demás** dice "los otros ya no cuentan", no
 * "este está puesto", y el ojo persigue lo que cambió. Y apagarlos demasiado
 * (se probó 0.22) borra la comparación, que es justo lo que se quería ver: a
 * quien elige una categoría le interesa esa categoría **contra las demás**.
 *
 * Así que lo elegido lleva tres señales propias —fondo, contorno de 2 y letra
 * en negrita o ✓— y el resto baja a 0.55, legible y recesivo. Ninguna de las
 * señales es el color sola.
 *
 * ## Tocar otra vez suelta
 *
 * Todas las gráficas que filtran llaman `onSelect(null)` si se toca lo que
 * ya estaba elegido. Es la forma de deshacer que se encuentra sin buscarla.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";

import { Button } from "../components/button";
import { DataTable, TableHead, TableRow, Td, Th } from "../components/data-table";
import { Card } from "../components/surfaces";
import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";

/** A cuánto bajan las marcas que no están elegidas. */
export const DIMMED_OPACITY = 0.55;

/** La opacidad de una marca según lo que esté elegido. */
export function markOpacity(selected: string | null | undefined, key: string): number {
  return !selected || selected === key ? 1 : DIMMED_OPACITY;
}

/** Cómo se formatea un valor en ejes, etiquetas y ayudas. */
export type ChartFormat = (value: number) => string;

/** Lo común a las gráficas que se pueden tocar. */
export interface SelectableChartProps {
  /** Lo que lee un lector de pantalla al llegar a la gráfica. */
  accessibilityLabel: string;
  /** La clave elegida, o `null`. Controlada desde fuera, para filtrar el resto. */
  selected?: string | null;
  /** Tocar una marca la elige; tocar la elegida la suelta (`null`). */
  onSelect?: (key: string | null) => void;
  format?: ChartFormat;
}

/** Elige o suelta: la regla de "tocar otra vez suelta", en un solo sitio. */
export function toggleSelection(selected: string | null | undefined, key: string): string | null {
  return selected === key ? null : key;
}

/** El ancho de la gráfica, medido: el panel se estira con la ventana. */
export function useMeasuredWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width)), []);
  return [width, onLayout];
}

/**
 * Qué marca tiene el puntero o el foco encima.
 *
 * El foco cuenta igual que el puntero: quien recorre con el teclado tiene
 * que ver la misma ayuda que quien pasa el ratón.
 */
export function useHoveredMark() {
  const [hovered, setHovered] = useState<string | null>(null);
  const bind = useCallback(
    (key: string) => ({
      onHoverIn: () => setHovered(key),
      onHoverOut: () => setHovered((h) => (h === key ? null : h)),
      onFocus: () => setHovered(key),
      onBlur: () => setHovered((h) => (h === key ? null : h)),
    }),
    [],
  );
  return { hovered, setHovered, bind };
}

// ── Ayuda emergente ───────────────────────────────────────────────────────

export interface TooltipRow {
  label: string;
  value: string;
  /** El color de la serie, como un trazo corto delante. */
  color?: string;
}

/**
 * La ayuda que sale con el puntero o el foco. La cifra va fuerte y el nombre
 * detrás, al revés que en la leyenda: acá ya se sabe qué serie es y lo que
 * se busca es el número. Nunca es el único camino a un valor: la tabla de la
 * tarjeta los tiene todos.
 */
export function ChartTooltip({
  x,
  y,
  containerWidth,
  title,
  rows,
}: {
  x: number;
  y: number;
  containerWidth: number;
  title: string;
  rows: TooltipRow[];
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const ancho = 180;
  // Se recorta a los bordes: en la primera y la última marca se saldría.
  const left = Math.max(0, Math.min(containerWidth - ancho, x - ancho / 2));
  return (
    <View pointerEvents="none" style={[s.tooltip, { left, top: Math.max(0, y), width: ancho }]}>
      <Text style={textStyle(t, "caption", t.color.text.secondary)} numberOfLines={1}>
        {title}
      </Text>
      {rows.map((r) => (
        <View key={r.label} style={s.tooltipFila}>
          {r.color ? <View style={[s.tooltipTrazo, { backgroundColor: r.color }]} /> : null}
          <Text style={[textStyle(t, "bodySmall"), s.tooltipValor]}>{r.value}</Text>
          <Text style={[textStyle(t, "caption", t.color.text.secondary), s.tooltipNombre]} numberOfLines={1}>
            {r.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Leyenda ───────────────────────────────────────────────────────────────

export interface LegendItem {
  key: string;
  label: string;
  color: string;
  /** Repite la forma de la marca: caja para barras y áreas, trazo para líneas. */
  shape?: "rect" | "line" | "dot";
  /** Una cifra al lado del nombre, si ayuda (el total de esa serie). */
  value?: string;
}

/**
 * La leyenda, que además filtra: tocar un nombre lo elige en la gráfica y en
 * todo lo que esa elección recorte. Cada entrada es un control con sus cuatro
 * estados, y lo elegido lleva ✓ y negrita además del fondo.
 */
export function ChartLegend({
  items,
  selected,
  onSelect,
  accessibilityLabel = "Leyenda",
}: {
  items: LegendItem[];
  selected?: string | null;
  onSelect?: (key: string | null) => void;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View accessibilityLabel={accessibilityLabel} style={s.leyenda}>
      {items.map((it) => {
        const elegido = selected === it.key;
        const contenido = (
          <>
            <View
              style={[
                s.muestra,
                it.shape === "line" ? s.muestraLinea : it.shape === "dot" ? s.muestraPunto : null,
                { backgroundColor: it.color },
              ]}
            />
            <Text style={[textStyle(t, "bodySmall", t.color.text.secondary), elegido && s.textoElegido]} numberOfLines={1}>
              {elegido ? "✓ " : ""}
              {it.label}
            </Text>
            {it.value ? <Text style={textStyle(t, "caption", t.color.text.tertiary)}>{it.value}</Text> : null}
          </>
        );
        if (!onSelect) {
          return (
            <View key={it.key} style={s.entrada}>
              {contenido}
            </View>
          );
        }
        return (
          <Pressable
            key={it.key}
            accessibilityRole="button"
            accessibilityState={{ selected: elegido }}
            accessibilityLabel={`${it.label}${it.value ? `: ${it.value}` : ""}`}
            onPress={() => onSelect(toggleSelection(selected, it.key))}
            style={(estado: EstadoPresionable) => {
              const i = resolveInteraction(estado, { selected: elegido });
              return [
                s.entrada,
                s.entradaTocable,
                { opacity: markOpacity(selected, it.key) },
                i === "hovered" && s.entradaEncima,
                i === "pressed" && s.entradaPresionada,
                i === "selected" && s.entradaElegida,
              ];
            }}
          >
            {contenido}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Si la tarjeta está dentro de una `ChartGrid`. */
const EnRejilla = createContext(false);

// ── Tarjeta ───────────────────────────────────────────────────────────────

export interface ChartTable {
  columns: string[];
  rows: string[][];
  /** Qué columnas son cifras, para alinearlas a la derecha. */
  numeric?: boolean[];
}

/**
 * La tarjeta de una gráfica: el título, la gráfica y, a un toque, la misma
 * información como tabla. La tabla no es un extra: es lo que lee quien no
 * distingue los colores, quien usa lector de pantalla o quien quiere la
 * cifra exacta sin pasar el ratón por cada barra.
 *
 * `empty` reemplaza la gráfica cuando no hay datos: una gráfica vacía con
 * sus ejes dice "cero", que no es lo mismo que "nada que mostrar".
 */
export function ChartCard({
  title,
  children,
  table,
  empty,
  action,
  span = 1,
}: {
  title: string;
  children: ReactNode;
  table?: ChartTable;
  /** El texto que va en lugar de la gráfica cuando no hay nada que pintar. */
  empty?: string | null;
  /** Un control extra en la cabecera (un "ver detalle"). */
  action?: ReactNode;
  /** Cuántas columnas ocupa en una rejilla de tablero (1 o 2). */
  span?: 1 | 2;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [comoTabla, setComoTabla] = useState(false);
  // Las medidas de rejilla solo valen dentro de una: en una columna, un
  // `flexBasis` se vuelve alto y la tarjeta se estira hasta empujar todo.
  const enRejilla = useContext(EnRejilla);
  return (
    <Card style={enRejilla ? [s.tarjeta, span === 2 ? s.tarjetaAncha : null] : s.tarjetaSuelta}>
      <View style={s.cabecera}>
        <Text accessibilityRole="header" style={[textStyle(t, "subtitle"), s.titulo]}>
          {title}
        </Text>
        {action}
        {table && !empty ? (
          <Button
            label={comoTabla ? "Ver gráfica" : "Ver tabla"}
            variant="ghost"
            size="sm"
            accessibilityLabel={comoTabla ? `Ver ${title} como gráfica` : `Ver ${title} como tabla`}
            onPress={() => setComoTabla((v) => !v)}
          />
        ) : null}
      </View>
      {empty ? (
        <Text style={[textStyle(t, "body", t.color.text.secondary), s.vacio]}>{empty}</Text>
      ) : comoTabla && table ? (
        <DataTable minWidth={Math.min(640, table.columns.length * 120)}>
          <TableHead>
            {table.columns.map((c, i) => (
              <Th key={c} align={table.numeric?.[i] ? "right" : undefined}>
                {c}
              </Th>
            ))}
          </TableHead>
          {table.rows.map((fila, r) => (
            <TableRow key={`${r}-${fila[0]}`}>
              {fila.map((celda, i) => (
                <Td key={i} align={table.numeric?.[i] ? "right" : undefined} mono={table.numeric?.[i]}>
                  {celda}
                </Td>
              ))}
            </TableRow>
          ))}
        </DataTable>
      ) : (
        children
      )}
    </Card>
  );
}

/**
 * Una rejilla de tarjetas: dos columnas en escritorio, una en el teléfono.
 * Una tarjeta con `span={2}` ocupa la fila entera.
 */
export function ChartGrid({ children }: { children: ReactNode }) {
  const s = useStyles(makeStyles);
  return (
    <EnRejilla.Provider value>
      <View style={s.rejilla}>{children}</View>
    </EnRejilla.Provider>
  );
}


const makeStyles = (t: Tema) =>
  StyleSheet.create({
    tooltip: {
      position: "absolute",
      zIndex: 10,
      padding: t.space.sm,
      gap: t.space.xxs,
      borderRadius: t.radius.md,
      backgroundColor: t.color.bg.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      boxShadow: t.elevation.md.boxShadow,
      elevation: t.elevation.md.elevation,
    },
    tooltipFila: { flexDirection: "row", alignItems: "center", gap: t.space.xs },
    tooltipTrazo: { width: 12, height: 3, borderRadius: 2 },
    tooltipValor: { fontWeight: "700" },
    tooltipNombre: { flexShrink: 1 },
    leyenda: { flexDirection: "row", flexWrap: "wrap", gap: t.space.xs },
    entrada: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.xs,
      paddingHorizontal: t.space.sm,
      // El mínimo tocable entero: va en una fila que se parte, y una zona que
      // sobresaliera se pisaría con la fila de abajo.
      minHeight: t.minTouch,
      borderRadius: t.radius.sm,
      borderWidth: 2,
      borderColor: "transparent",
    },
    entradaTocable: { cursor: "pointer" },
    entradaEncima: { backgroundColor: t.color.bg.hover },
    entradaPresionada: { backgroundColor: t.color.bg.pressed },
    entradaElegida: { backgroundColor: t.color.accent.subtle, borderColor: t.color.border.focus },
    textoElegido: { color: t.color.text.primary, fontWeight: "700" },
    muestra: { width: 10, height: 10, borderRadius: 2 },
    muestraLinea: { width: 14, height: 3, borderRadius: 2 },
    muestraPunto: { width: 9, height: 9, borderRadius: 5 },
    // `flexShrink` explícito: en React Native vale 0, y en un teléfono la tarjeta se quedaba en 420 y se salía.
    tarjeta: { flexGrow: 1, flexShrink: 1, flexBasis: 420, minWidth: 0, gap: t.space.md },
    tarjetaAncha: { flexBasis: "100%" },
    tarjetaSuelta: { gap: t.space.md },
    cabecera: { flexDirection: "row", alignItems: "center", gap: t.space.sm, minHeight: 38 },
    titulo: { flex: 1 },
    vacio: { paddingVertical: t.space.xl, textAlign: "center" },
    rejilla: { flexDirection: "row", flexWrap: "wrap", gap: t.space.lg },
  });
