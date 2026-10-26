/**
 * Tarjetas en columnas parejas: las que entran según el ancho, todas del
 * mismo tamaño.
 *
 * - **La última no se estira.** Con `flexWrap` y `flexGrow`, la tarjeta que
 *   queda sola en su fila ocupa todo el ancho y se lee como otra cosa (un
 *   aviso, un resumen). Acá cada celda mide lo mismo.
 * - **Las de una fila miden lo mismo de alto**: la tarjeta lleva `flexGrow: 1`
 *   para llenar su celda.
 * - En el teléfono, una sola columna sin que la pantalla lo pida.
 */
import { Children, useState, type ReactNode } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { columnasDeRejilla } from "./card-grid-logic";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";

export interface CardGridProps {
  /** El ancho por debajo del cual una tarjeta no se lee bien. */
  minItemWidth: number;
  /** Tope de columnas, para lo que no gana nada con filas más largas. */
  maxColumns?: number;
  gap?: "sm" | "md";
  children: ReactNode;
}

export function CardGrid({ minItemWidth, maxColumns, gap = "md", children }: CardGridProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [ancho, setAncho] = useState(0);
  const separacion = t.space[gap];
  const { columnas, anchoDeCelda } = columnasDeRejilla(ancho, minItemWidth, separacion, maxColumns);

  function medir(e: LayoutChangeEvent) {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w !== ancho) setAncho(w);
  }

  return (
    <View style={[s.rejilla, { gap: separacion }]} onLayout={medir}>
      {Children.toArray(children).map((hijo, i) => (
        <View key={i} style={columnas > 1 ? [s.celda, { width: anchoDeCelda }] : s.unaColumna}>
          {hijo}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (_t: Tema) =>
  StyleSheet.create({
    rejilla: { flexDirection: "row", flexWrap: "wrap", alignItems: "stretch" },
    celda: { minWidth: 0 },
    unaColumna: { width: "100%", minWidth: 0 },
  });
