/**
 * Un desplegable, y siempre el mismo: se toca, se abre una lista, se toca una
 * opción.
 *
 * La lista se dibuja **fuera del árbol de la pantalla**, en un `Modal`
 * transparente, y se coloca midiendo dónde quedó el control. Dentro de una
 * zona que se desplaza, una lista en `position: absolute` queda recortada por
 * esa zona; en su propia capa no la recorta nada, puede abrirse **hacia
 * arriba** cuando el control está al pie de la ventana, y se cierra al tocar
 * fuera.
 *
 * Los cuatro estados:
 *
 * - el control: reposo, encima (borde y fondo), presionado, abierto;
 * - cada opción: reposo, resaltada (fondo + barra a la izquierda, que es
 *   también la del teclado), presionada, elegida (fondo + letra gruesa + ✓);
 * - **con `neutro`**, el control cerrado avisa que hay un recorte: borde de
 *   acento, fondo teñido y un punto. El punto está porque el color no puede
 *   ser la única señal, y el nombre accesible lo dice en palabras.
 *
 * Con el teclado: ↑↓ para moverse, Enter para elegir, Esc para cerrar.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import {
  hitSlopFor,
  resolveInteraction,
  type EstadoPresionable,
  type ForcedInteraction,
} from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import { TouchArea } from "./touch-area";
import { Icon } from "./icon";
import type { Tema } from "../tokens";
import { filterOptions, isFiltering, moveActive, type SelectOption } from "./select-logic";
import { FieldLabel } from "./text-field";

export type { SelectOption } from "./select-logic";

const MARGIN = 12;
const FILTER_HEIGHT = 40;
const FOOTER_HEIGHT = 28;
const CLEAR_HEIGHT = 44;
const MIN_WIDTH = 230;
const MAX_WIDTH = 360;

export interface SelectProps {
  value?: string;
  options: SelectOption[];
  onChange: (id: string) => void;
  placeholder: string;
  /** Qué se elige, para quien no ve la pantalla. */
  accessibilityLabel: string;
  label?: string;
  size?: "sm" | "md";
  /**
   * La opción que significa "sin filtrar" (`Todas`, `Cualquiera`). Con esto
   * puesto, el control cerrado se marca cuando la elegida es otra.
   */
  neutro?: string;
  /** Dibuja "quitar" al pie de la lista, para volver a no tener nada elegido. */
  onClear?: () => void;
  clearLabel?: string;
  /** A partir de cuántas opciones aparece el buscador. Con pocas, estorba. */
  filterFrom?: number;
  disabled?: boolean;
  error?: string | null;
  /** Textos de la lista, para traducir. */
  texts?: Partial<SelectTexts>;
  /** Solo para vitrina, Storybook y Figma. */
  forcedState?: ForcedInteraction;
}

export interface SelectTexts {
  filterPlaceholder: string;
  empty: string;
  noMatch: (query: string) => string;
  keyboardHint: string;
  closeList: string;
  filteringBy: (label: string) => string;
}

const defaultTexts: SelectTexts = {
  filterPlaceholder: "Escribe para filtrar…",
  empty: "No hay nada que elegir todavía.",
  noMatch: (q) => `Nada coincide con «${q}».`,
  keyboardHint: "↑↓ para moverse · Enter para elegir · Esc para cerrar",
  closeList: "Cerrar la lista",
  filteringBy: (l) => `Filtrando por ${l}`,
};

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function Select({
  value,
  options,
  onChange,
  placeholder,
  accessibilityLabel,
  label,
  size = "md",
  neutro,
  onClear,
  clearLabel = "Quitar",
  filterFrom = 8,
  disabled = false,
  error,
  texts,
  forcedState,
}: SelectProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const tx = { ...defaultTexts, ...texts };
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const control = useRef<View>(null);
  const rows = useRef(new Map<string, View | null>());
  const { height: winH, width: winW } = useWindowDimensions();

  const selected = options.find((o) => o.id === value);
  const withFilter = options.length >= filterFrom;
  const visible = useMemo(() => filterOptions(options, query), [options, query]);
  const filtering = isFiltering(value, neutro);
  const height = t.control[size === "sm" ? "sm" : "md"];

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  function take(option: SelectOption) {
    onChange(option.id);
    close();
  }

  /** Se mide antes de abrir: la lista vive en otra capa y necesita saber dónde colgarse. */
  function openList() {
    setQuery("");
    const i = Math.max(0, options.findIndex((o) => o.id === value));
    setActive(i);
    const node = control.current;
    if (!node?.measureInWindow) {
      setOpen(true);
      return;
    }
    node.measureInWindow((x, y, width, h) => {
      setBox({ x, y, width, height: h });
      setOpen(true);
    });
  }

  function onKey(e: { nativeEvent: { key: string }; preventDefault?: () => void }) {
    const key = e.nativeEvent.key;
    if (key === "Escape") return close();
    if (key === "ArrowDown" || key === "ArrowUp") {
      e.preventDefault?.();
      setActive((i) => moveActive(visible, i, key === "ArrowDown" ? 1 : -1));
    } else if (key === "Enter") {
      e.preventDefault?.();
      const o = visible[active];
      if (o && !o.disabled) take(o);
    }
  }

  // La resaltada se acerca a la vista: bajando con la flecha no se va por debajo del borde.
  useEffect(() => {
    if (!open) return;
    const node = rows.current.get(visible[active]?.id ?? "") as unknown as {
      scrollIntoView?: (o: ScrollIntoViewOptions) => void;
    } | null;
    node?.scrollIntoView?.({ block: "nearest" });
  }, [open, active, visible]);

  // Dónde cae la lista: abajo, salvo que abajo no quepa y arriba sí.
  const a = box ?? { x: 0, y: 0, width: 0, height: 0 };
  const below = winH - (a.y + a.height) - MARGIN;
  const above = a.y - MARGIN;
  const upward = below < 220 && above > below;
  const room = Math.max(140, upward ? above : below);
  const listW = Math.max(MIN_WIDTH, a.width);
  const capW = Math.min(MAX_WIDTH, winW - MARGIN * 2);
  const optionsH = Math.max(
    90,
    Math.min(300, room - (withFilter ? FILTER_HEIGHT + FOOTER_HEIGHT : 0) - (onClear && selected ? CLEAR_HEIGHT : 0)),
  );
  const place = {
    left: Math.max(MARGIN, Math.min(a.x, winW - Math.max(listW, capW) - MARGIN)),
    minWidth: Math.min(listW, capW),
    maxWidth: capW,
    ...(upward ? { bottom: winH - a.y } : { top: a.y + a.height }),
  } as const;

  return (
    <View style={[s.wrap, open && s.wrapOpen]}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}

      <Pressable
        ref={control}
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled }}
        accessibilityLabel={
          filtering ? `${accessibilityLabel}. ${tx.filteringBy(selected?.label ?? "")}` : accessibilityLabel
        }
        accessibilityHint={error ?? undefined}
        disabled={disabled}
        hitSlop={hitSlopFor(height, t.minTouch)}
        onPress={() => (open ? close() : openList())}
        style={(state: EstadoPresionable) => {
          const i = resolveInteraction(state, { disabled, forced: forcedState });
          return [
            s.control,
            { minHeight: height },
            filtering && s.controlFiltering,
            Boolean(error) && s.controlError,
            (open || i === "selected") && s.controlOpen,
            i === "hovered" && s.controlHovered,
            i === "pressed" && s.controlPressed,
            i === "disabled" && s.controlDisabled,
          ];
        }}
      >
        {filtering ? <View style={s.dot} /> : null}
        <Text
          numberOfLines={1}
          style={[
            textStyle(t, size === "sm" ? "bodySmall" : "body"),
            s.value,
            filtering && s.valueFiltering,
            !selected && { color: t.color.text.placeholder },
            disabled && { color: t.color.text.disabled },
          ]}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Icon
          name="chevron-down"
          size="sm"
          color={disabled ? t.color.text.disabled : t.color.text.secondary}
          style={open ? s.caretOpen : undefined}
        />
        <TouchArea height={height} />
      </Pressable>

      {error ? (
        <View style={s.errorRow} accessibilityRole="alert">
          <Text style={[textStyle(t, "caption", t.color.danger.fg), s.errorIcon]}>!</Text>
          <Text style={[textStyle(t, "caption", t.color.danger.fg), s.errorText]}>{error}</Text>
        </View>
      ) : null}

      <Modal transparent visible={open} animationType="none" onRequestClose={close}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tx.closeList}
          style={StyleSheet.absoluteFill}
          onPress={close}
        />
        <View style={[s.list, place, upward && s.listUp]} accessibilityViewIsModal>
          {withFilter ? (
            <TextInput
              accessibilityLabel={`${accessibilityLabel}: ${tx.filterPlaceholder}`}
              value={query}
              onChangeText={(q) => {
                setQuery(q);
                setActive(0);
              }}
              onKeyPress={onKey}
              placeholder={tx.filterPlaceholder}
              placeholderTextColor={t.color.text.placeholder}
              style={[textStyle(t, "bodySmall"), s.filter]}
              autoFocus
            />
          ) : null}

          <ScrollView style={{ maxHeight: optionsH }} keyboardShouldPersistTaps="handled">
            {visible.length === 0 ? (
              <Text style={[textStyle(t, "bodySmall", t.color.text.secondary), s.empty]}>
                {options.length === 0 ? tx.empty : tx.noMatch(query.trim())}
              </Text>
            ) : (
              visible.map((o, index) => {
                const chosen = o.id === value;
                const highlighted = index === active && !o.disabled;
                return (
                  <Pressable
                    key={o.id}
                    ref={(n) => {
                      rows.current.set(o.id, n);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: chosen, disabled: o.disabled }}
                    accessibilityLabel={o.detail ? `${o.label}, ${o.detail}` : o.label}
                    disabled={o.disabled}
                    onPress={() => take(o)}
                    // El resalte del teclado sigue al puntero: dos marcas de
                    // "vas a elegir esto" en dos sitios se contradicen.
                    onHoverIn={() => {
                      if (!o.disabled) setActive(index);
                    }}
                    style={({ pressed }: EstadoPresionable) => [
                      s.option,
                      highlighted && s.optionHighlighted,
                      chosen && s.optionChosen,
                      pressed && !o.disabled && s.optionPressed,
                    ]}
                  >
                    <View style={s.optionText}>
                      <Text
                        numberOfLines={1}
                        style={[
                          textStyle(t, "bodySmall", t.color.text.primary),
                          chosen && s.optionLabelChosen,
                          o.disabled && { color: t.color.text.disabled },
                        ]}
                      >
                        {o.label}
                      </Text>
                      {o.detail ? (
                        <Text numberOfLines={1} style={textStyle(t, "caption", t.color.text.tertiary)}>
                          {o.detail}
                        </Text>
                      ) : null}
                    </View>
                    {chosen ? <Icon name="check" size="sm" color={t.color.accent.text} strokeWidth={2.5} /> : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {withFilter && visible.length > 0 ? (
            <Text style={[textStyle(t, "caption", t.color.text.tertiary), s.hint]}>{tx.keyboardHint}</Text>
          ) : null}

          {onClear && selected ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${clearLabel} ${selected.label}`}
              onPress={() => {
                onClear();
                close();
              }}
              style={(state: EstadoPresionable) => {
                const i = resolveInteraction(state);
                return [s.clear, i === "hovered" && s.clearHovered, i === "pressed" && s.clearPressed];
              }}
            >
              <Text style={textStyle(t, "bodySmall", t.color.accent.text)}>{clearLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    wrap: { gap: t.space.xs + 2 },
    // Mientras está abierto se pone por encima de sus hermanos.
    wrapOpen: { zIndex: 30 },
    control: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.space.sm,
      paddingHorizontal: t.space.md,
      borderWidth: 1,
      borderRadius: t.radius.sm,
      borderColor: t.color.border.strong,
      backgroundColor: t.color.bg.surface,
      cursor: "pointer",
    },
    controlOpen: { borderColor: t.color.border.focus, backgroundColor: t.color.bg.hover },
    controlHovered: { borderColor: t.color.border.focus, backgroundColor: t.color.bg.hover },
    controlPressed: { borderColor: t.color.border.focus, backgroundColor: t.color.bg.pressed },
    controlFiltering: { borderColor: t.color.accent.base, backgroundColor: t.color.accent.subtle },
    controlError: { borderColor: t.color.danger.fg, borderWidth: 2 },
    controlDisabled: {
      backgroundColor: t.color.bg.disabled,
      borderColor: t.color.border.default,
      cursor: "auto",
    },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.color.accent.base },
    value: { flex: 1 },
    valueFiltering: { fontWeight: "600" },
    caretOpen: { transform: [{ rotate: "180deg" }] },
    errorRow: { flexDirection: "row", gap: t.space.xs + 2, alignItems: "flex-start" },
    errorIcon: {
      fontWeight: "700",
      width: 16,
      height: 16,
      lineHeight: 16,
      textAlign: "center",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.color.danger.fg,
      fontSize: 11,
    },
    errorText: { flex: 1 },
    list: {
      position: "absolute",
      zIndex: 30,
      borderWidth: 1,
      borderColor: t.color.border.focus,
      borderRadius: t.radius.sm,
      backgroundColor: t.color.bg.surface,
      marginTop: 4,
      overflow: "hidden",
      ...t.elevation.md,
    },
    listUp: { marginTop: 0, marginBottom: 4 },
    filter: {
      minHeight: FILTER_HEIGHT,
      paddingHorizontal: t.space.md,
      borderBottomWidth: 1,
      borderBottomColor: t.color.border.subtle,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.space.sm,
      minHeight: t.control.md,
      paddingHorizontal: t.space.md,
      paddingVertical: t.space.xs,
      borderLeftWidth: 3,
      borderLeftColor: "transparent",
      cursor: "pointer",
    },
    optionPressed: { backgroundColor: t.color.bg.pressed },
    // La que entra con Enter. Lleva barra además de fondo: si es la elegida,
    // el fondo de elegida gana y sin la barra el resalte desaparecería ahí.
    optionHighlighted: { backgroundColor: t.color.bg.hover, borderLeftColor: t.color.accent.base },
    optionChosen: { backgroundColor: t.color.accent.subtle },
    optionText: { flex: 1 },
    optionLabelChosen: { fontWeight: "600" },
    hint: {
      minHeight: FOOTER_HEIGHT,
      paddingHorizontal: t.space.md,
      paddingVertical: t.space.xs + 2,
      borderTopWidth: 1,
      borderTopColor: t.color.border.subtle,
    },
    empty: { padding: t.space.md },
    clear: {
      minHeight: CLEAR_HEIGHT,
      justifyContent: "center",
      paddingHorizontal: t.space.md,
      borderTopWidth: 1,
      borderTopColor: t.color.border.subtle,
      cursor: "pointer",
    },
    clearHovered: { backgroundColor: t.color.bg.hover },
    clearPressed: { backgroundColor: t.color.accent.subtle },
  });
