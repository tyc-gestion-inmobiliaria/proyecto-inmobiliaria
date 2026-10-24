/**
 * Las secciones en el teléfono: una barra abajo, al alcance del pulgar, con
 * las mismas entradas que el `SideMenu` de la web.
 *
 * - **Cada entrada lleva su ícono (o su inicial) y su nombre.** Nada de
 *   íconos solos: el nombre dice adónde lleva.
 * - **Lo elegido lleva tres señales**: la píldora detrás del ícono, el trazo
 *   más grueso y la letra gruesa; el color es la cuarta.
 * - **Mide al menos 44 de alto y de ancho** por entrada.
 * - Con más entradas que ancho, la barra se desliza de costado en vez de
 *   apretarlas hasta que no se lean.
 * - **No navega por su cuenta**, igual que `SideMenu`: avisa con `onSelect`.
 */
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { resolveInteraction, type EstadoPresionable, type ForcedInteraction } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { Icon } from "./icon";
import type { SideMenuItem } from "./side-menu";

export interface BottomNavProps<K extends string> {
  items: SideMenuItem<K>[];
  activeKey?: K;
  onSelect: (key: K) => void;
  /** Nombre de la barra para quien no ve: "Secciones". */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  /** Solo para vitrina, Storybook y Figma. */
  forcedStates?: Partial<Record<K, ForcedInteraction>>;
}

export function BottomNav<K extends string>({
  items,
  activeKey,
  onSelect,
  accessibilityLabel,
  style,
  forcedStates,
}: BottomNavProps<K>) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={[s.barra, style]} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fila}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active, disabled: item.disabled }}
              disabled={item.disabled}
              onPress={() => onSelect(item.key)}
              style={(state: EstadoPresionable) => {
                const i = resolveInteraction(state, {
                  selected: active,
                  disabled: item.disabled,
                  forced: forcedStates?.[item.key],
                });
                return [
                  s.item,
                  i === "hovered" && s.itemHovered,
                  i === "pressed" && s.itemPressed,
                  i === "selected" && s.itemActive,
                ];
              }}
            >
              {item.icon ? (
                <View style={[s.pill, active && s.pillActive]}>
                  <Icon
                    name={item.icon}
                    color={item.disabled ? t.color.text.disabled : active ? t.color.accent.text : t.color.text.secondary}
                    strokeWidth={active ? 2.25 : 2}
                  />
                </View>
              ) : (
                <View style={[s.initial, active ? s.initialActive : s.initialRest]}>
                  <Text
                    style={[
                      textStyle(t, "caption", active ? t.color.text.onAccent : t.color.text.secondary),
                      s.bold,
                      item.disabled && { color: t.color.text.disabled },
                    ]}
                  >
                    {(item.initial ?? item.label.charAt(0)).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text
                numberOfLines={1}
                style={[
                  textStyle(t, "caption", active ? t.color.accent.text : t.color.text.secondary),
                  active && s.bold,
                  item.disabled && { color: t.color.text.disabled },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    barra: {
      backgroundColor: t.color.bg.surface,
      borderTopWidth: 1,
      borderTopColor: t.color.border.default,
    },
    fila: { flexGrow: 1, justifyContent: "space-around" },
    item: {
      minWidth: 72,
      minHeight: t.minTouch + t.space.md,
      alignItems: "center",
      justifyContent: "center",
      gap: t.space.xxs,
      paddingHorizontal: t.space.sm,
      paddingVertical: t.space.xs,
      cursor: "pointer",
    },
    itemHovered: { backgroundColor: t.color.bg.hover },
    itemPressed: { backgroundColor: t.color.bg.pressed },
    itemActive: {},
    pill: { width: 56, height: 28, borderRadius: t.radius.full, alignItems: "center", justifyContent: "center" },
    pillActive: { backgroundColor: t.color.accent.subtle },
    initial: { width: 24, height: 24, borderRadius: t.radius.sm, alignItems: "center", justifyContent: "center" },
    initialActive: { backgroundColor: t.color.accent.base },
    initialRest: { backgroundColor: t.color.bg.muted },
    bold: { fontWeight: "600" },
  });
