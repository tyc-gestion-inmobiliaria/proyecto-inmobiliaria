/**
 * Un ícono de trazo, del juego del kit (`icon-paths.ts`).
 *
 * - **Decorativo por defecto:** junto a un texto que ya dice lo mismo, el
 *   ícono no se anuncia (`aria-hidden`, `accessibilityElementsHidden`).
 * - **Con `label`, se anuncia como imagen:** para el ícono que va solo y
 *   carga un significado (un estado sin palabra al lado, por ejemplo). Un
 *   botón con solo ícono lleva el nombre en el botón, no acá.
 * - **Tres tamaños** (16, 20, 24) y un solo grosor de trazo, para que todos
 *   pesen lo mismo en la pantalla.
 * - El color sale del tema por defecto (texto secundario); se pasa otro
 *   cuando el ícono acompaña un texto de color.
 */
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { useTheme } from "../theme/theme-provider";
import { ICON_SIZE, ICONS, type IconName, type IconShape, type IconSize } from "./icon-paths";

export interface IconProps {
  name: IconName;
  size?: IconSize;
  color?: string;
  /** Solo si el ícono va solo y significa algo. Sin `label`, es decorativo. */
  label?: string;
  /** El grosor del trazo, en la grilla de 24. */
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = "md", color, label, strokeWidth = 2, style }: IconProps) {
  const t = useTheme();
  const px = ICON_SIZE[size];
  const trazo = color ?? t.color.text.secondary;
  const accesible = label
    ? { accessible: true, accessibilityRole: "image" as const, accessibilityLabel: label }
    : { accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" as const, "aria-hidden": true };
  return (
    <View style={[{ width: px, height: px }, style]} {...accesible}>
      <Svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        stroke={trazo}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {(ICONS[name] as readonly IconShape[]).map((forma, i) =>
          "d" in forma ? (
            <Path key={i} d={forma.d} />
          ) : "circle" in forma ? (
            <Circle key={i} cx={forma.circle[0]} cy={forma.circle[1]} r={forma.circle[2]} />
          ) : (
            <Rect key={i} x={forma.rect[0]} y={forma.rect[1]} width={forma.rect[2]} height={forma.rect[3]} rx={forma.rect[4]} />
          ),
        )}
      </Svg>
    </View>
  );
}

export { ICON_SIZE, ICONS };
export type { IconName, IconSize };
