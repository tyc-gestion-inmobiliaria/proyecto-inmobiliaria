/**
 * Pestañas: cambian qué parte de una misma pantalla se ve.
 *
 * - **No son filtros.** Un filtro recorta una lista y se nota con su marca;
 *   una pestaña cambia de vista. Si las opciones recortan lo mismo, van en un
 *   `ChoiceChips` o un `Select`.
 * - **Lo elegido lleva tres señales**: la raya de 3 debajo, la letra en
 *   negrita y el color. Quien no distingue el color ve las otras dos.
 * - **El contador** dice cuántos hay detrás de cada una antes de tocarla
 *   ("Reservados 4"), que es lo que decide si vale la pena abrirla. En cero
 *   se escribe igual: "0" dice algo, un hueco no.
 * - Con más pestañas que ancho, la fila se desliza de costado.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable, type ForcedInteraction } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";

export interface TabItem<K extends string = string> {
  key: K;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps<K extends string> {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  accessibilityLabel: string;
  /** Solo para vitrina, Storybook y Figma: pinta la primera en este estado. */
  forcedState?: ForcedInteraction;
}

export function Tabs<K extends string>({ items, value, onChange, accessibilityLabel, forcedState }: TabsProps<K>) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.barra} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fila}>
        {items.map((it, i) => {
          const elegida = it.key === value;
          return (
            <Pressable
              key={it.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: elegida, disabled: it.disabled }}
              accessibilityLabel={it.count !== undefined ? `${it.label}, ${it.count}` : it.label}
              disabled={it.disabled}
              onPress={() => onChange(it.key)}
              style={(estado: EstadoPresionable) => {
                const r = resolveInteraction(estado, { selected: elegida, disabled: it.disabled, forced: i === 0 ? forcedState : undefined });
                return [s.tab, r === "hovered" && s.encima, r === "pressed" && s.presionada, r === "selected" && s.elegida];
              }}
            >
              <Text
                style={[
                  textStyle(t, "body", it.disabled ? t.color.text.disabled : elegida ? t.color.text.primary : t.color.text.secondary),
                  elegida && s.negrita,
                ]}
              >
                {it.label}
              </Text>
              {it.count !== undefined ? (
                <View style={[s.contador, elegida && s.contadorElegido]}>
                  <Text style={textStyle(t, "caption", elegida ? t.color.text.onAccent : t.color.text.secondary)}>{it.count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    barra: { borderBottomWidth: 1, borderBottomColor: t.color.border.default },
    fila: { flexDirection: "row", gap: t.space.xs },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.xs,
      minHeight: t.minTouch,
      paddingHorizontal: t.space.md,
      borderBottomWidth: 3,
      borderBottomColor: "transparent",
      marginBottom: -1,
      borderTopLeftRadius: t.radius.sm,
      borderTopRightRadius: t.radius.sm,
      cursor: "pointer",
    },
    encima: { backgroundColor: t.color.bg.hover, borderBottomColor: t.color.border.strong },
    presionada: { backgroundColor: t.color.bg.pressed },
    elegida: { borderBottomColor: t.color.accent.base },
    negrita: { fontWeight: "700" },
    contador: { minWidth: 22, paddingHorizontal: 6, paddingVertical: 1, borderRadius: t.radius.full, backgroundColor: t.color.bg.muted, alignItems: "center" },
    contadorElegido: { backgroundColor: t.color.accent.base },
  });
