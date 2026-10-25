/**
 * Las piezas de un formulario, normalmente dentro de un diálogo.
 *
 * - **Un título de verdad** arriba, y nada encima.
 * - **Grupos con nombre**: se lee de un vistazo qué pide el formulario, y lo
 *   opcional se dice una vez por grupo y no en cada etiqueta.
 * - **Dos columnas** donde los campos son cortos y van juntos; en una ventana
 *   angosta se apilan solos.
 * - **El pie dice qué falta** cuando el botón principal está apagado. Un
 *   botón gris sin explicación obliga a adivinar qué campo no gustó.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { Chip } from "./chip";
import { Icon } from "./icon";

export function Form({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <ScrollView contentContainerStyle={s.form}>
      <Text accessibilityRole="header" style={[textStyle(t, "title"), s.title]}>
        {title}
      </Text>
      {children}
    </ScrollView>
  );
}

/**
 * Un grupo de campos que van juntos. `note` es para lo que cambia lo que la
 * persona va a hacer, no para explicar el sistema.
 */
export function FormGroup({
  title,
  optional,
  optionalLabel = "opcional",
  note,
  children,
}: {
  title: string;
  optional?: boolean;
  optionalLabel?: string;
  note?: string;
  children: ReactNode;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.group}>
      <View style={s.groupHead}>
        <Text style={textStyle(t, "subtitle")}>{title}</Text>
        {optional ? <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{optionalLabel}</Text> : null}
      </View>
      {note ? <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{note}</Text> : null}
      <View style={s.groupFields}>{children}</View>
    </View>
  );
}

/** Campos lado a lado; cada uno pide un ancho mínimo y la fila se parte sola. */
export function FormRow({ children }: { children: ReactNode }) {
  const s = useStyles(makeStyles);
  return <View style={s.row}>{children}</View>;
}

/** Una celda de `FormRow`. `narrow` para lo corto: un monto, una hora. */
export function FormCell({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  const s = useStyles(makeStyles);
  return <View style={narrow ? s.cellNarrow : s.cell}>{children}</View>;
}

/**
 * Elegir una entre pocas opciones, como fichas. Es un grupo de radio: una
 * sola puesta. Con `clearable`, tocar la puesta la quita.
 *
 * Como filtro, `allLabel` pone primero la ficha de "todo" ("Todas las
 * áreas"), elegida cuando no hay filtro: sin ella, el filtro apagado no se
 * distingue de un grupo sin elegir y no se ve qué se está mirando.
 */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  clearable,
  allLabel,
  accessibilityLabel,
}: {
  options: { id: T; label: string; disabled?: boolean }[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  clearable?: boolean;
  allLabel?: string;
  accessibilityLabel: string;
}) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.chips} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {allLabel ? <Chip label={allLabel} selected={value === undefined} onPress={() => onChange(undefined)} /> : null}
      {options.map((o) => (
        <Chip
          key={o.id}
          label={o.label}
          selected={o.id === value}
          disabled={o.disabled}
          onPress={() => onChange(clearable && o.id === value ? undefined : o.id)}
        />
      ))}
    </View>
  );
}

/**
 * El pie: el error del guardado arriba, y en la fila lo que falta a la
 * izquierda y los botones a la derecha. `missing` desaparece en cuanto el
 * formulario está completo.
 */
export function FormFooter({
  missing,
  error,
  children,
}: {
  missing?: string | null;
  error?: string | null;
  children: ReactNode;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.footer}>
      {error ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={textStyle(t, "bodySmall", t.color.danger.fg)}>
          {error}
        </Text>
      ) : null}
      <View style={s.footerRow}>
        <Text style={[textStyle(t, "bodySmall", t.color.text.secondary), s.missing]} accessibilityLiveRegion="polite">
          {missing ?? ""}
        </Text>
        <View style={s.buttons}>{children}</View>
      </View>
    </View>
  );
}

/**
 * El resumen de errores de arriba del formulario, después de intentar
 * guardar. **Acompaña** al error junto al campo, no lo reemplaza: dice
 * cuántas cosas hay que corregir aunque el campo quede fuera de la vista.
 *
 * - Cada línea lleva el nombre del campo y qué pasa; tocarla lleva el foco
 *   al campo (`onPress`).
 * - En la web, al cambiar `focusKey` (un intento fallido más) el foco salta
 *   al resumen, para que el teclado y el lector de pantalla lo encuentren.
 *   En el teléfono se anuncia como alerta.
 * - Rojo, pero con el signo y el borde: el color no es la única señal.
 */
export function ErrorSummary({
  title,
  items,
  focusKey,
}: {
  title: string;
  items: { key: string; label: string; message: string; onPress?: () => void }[];
  focusKey?: number;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const caja = useRef<View>(null);

  useEffect(() => {
    if (focusKey && Platform.OS === "web") caja.current?.focus();
  }, [focusKey]);

  if (items.length === 0) return null;
  return (
    <View ref={caja} tabIndex={-1} accessibilityRole="alert" accessibilityLiveRegion="assertive" style={s.summary}>
      <View style={s.summaryTitle}>
        <Icon name="alert-circle" color={t.color.danger.fg} />
        <Text accessibilityRole="header" style={[textStyle(t, "subtitle", t.color.danger.fg), s.summaryTitleText]}>
          {title}
        </Text>
      </View>
      <View>
        {items.map((item) =>
          item.onPress ? (
            <Pressable
              key={item.key}
              accessibilityRole="link"
              accessibilityLabel={`${item.label}: ${item.message}`}
              onPress={item.onPress}
              style={(state: EstadoPresionable) => {
                const i = resolveInteraction(state);
                return [s.summaryItem, i === "hovered" && s.summaryItemHovered, i === "pressed" && s.summaryItemPressed];
              }}
            >
              <Text style={[textStyle(t, "bodySmall", t.color.danger.fg), s.summaryLink]}>
                <Text style={s.summaryField}>{item.label}:</Text> {item.message}
              </Text>
            </Pressable>
          ) : (
            <View key={item.key} style={s.summaryItem}>
              <Text style={textStyle(t, "bodySmall", t.color.danger.fg)}>
                <Text style={s.summaryField}>{item.label}:</Text> {item.message}
              </Text>
            </View>
          ),
        )}
      </View>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    form: { padding: t.space.xl + 4, gap: t.space.xl - 2 },
    // Deja sitio a la ✕ del diálogo, que va arriba a la derecha.
    title: { paddingRight: 36 },
    group: { gap: t.space.md - 2, paddingTop: t.space.lg + 2, borderTopWidth: 1, borderTopColor: t.color.border.default },
    groupHead: { flexDirection: "row", alignItems: "baseline", gap: t.space.sm },
    groupFields: { gap: t.space.md },
    row: { flexDirection: "row", flexWrap: "wrap", gap: t.space.md },
    cell: { flexGrow: 1, flexBasis: 200 },
    cellNarrow: { flexGrow: 1, flexBasis: 140 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: t.space.sm },
    footer: { gap: t.space.md - 2, paddingTop: t.space.lg + 2, borderTopWidth: 1, borderTopColor: t.color.border.default },
    footerRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: t.space.md },
    missing: { flex: 1, minWidth: 160 },
    buttons: { flexDirection: "row", gap: t.space.sm + 2 },
    summaryTitle: { flexDirection: "row", alignItems: "center", gap: t.space.sm },
    summaryTitleText: { flex: 1 },
    summary: {
      gap: t.space.xs,
      padding: t.space.lg,
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderLeftWidth: 4,
      borderColor: t.color.danger.fg,
      backgroundColor: t.color.danger.bg,
      outlineColor: t.color.border.focus,
    },
    // Las líneas van apiladas y sin hueco: cada una mide los 44 tocables por sí misma.
    summaryItem: {
      minHeight: t.minTouch,
      justifyContent: "center",
      paddingHorizontal: t.space.sm,
      marginHorizontal: -t.space.sm,
      borderRadius: t.radius.sm,
    },
    summaryItemHovered: { backgroundColor: t.color.danger.hoverBg, cursor: "pointer" },
    summaryItemPressed: { backgroundColor: t.color.danger.hoverBg, transform: [{ scale: 0.99 }] },
    summaryLink: { textDecorationLine: "underline" },
    summaryField: { fontWeight: "600" },
  });
