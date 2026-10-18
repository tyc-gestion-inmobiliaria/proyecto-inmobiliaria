/**
 * Una cifra que baja de tamaño antes que partirse en dos renglones.
 *
 * Con la coma de miles, una cifra grande deja de entrar en una tarjeta de
 * indicador y se parte: el símbolo arriba, el número abajo. La cifra mide el
 * ancho que tiene y elige el tamaño que le cabe, con el de siempre como techo
 * y un mínimo por debajo del cual se recorta con puntos.
 *
 * La cuenta supone letra monoespaciada, que es como el kit pinta las cifras.
 */
import { useState } from "react";
import { Text, View, type StyleProp, type TextStyle } from "react-native";

import { textStyle } from "../theme/text-style";
import { useTheme } from "../theme/theme-provider";
import { fitFontSize } from "./number-logic";

export interface FitNumberProps {
  children: string;
  /** El tamaño que lleva cuando entra. */
  size?: number;
  min?: number;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export function FitNumber({ children, size = 28, min = 14, style, accessibilityLabel }: FitNumberProps) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const fontSize = fitFontSize(children, width, size, min);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Text
        numberOfLines={1}
        accessibilityLabel={accessibilityLabel}
        style={[textStyle(t, "data"), { fontWeight: "600" }, style, { fontSize, lineHeight: Math.round(fontSize * 1.2) }]}
      >
        {children}
      </Text>
    </View>
  );
}
