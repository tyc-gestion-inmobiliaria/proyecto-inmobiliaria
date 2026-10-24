/**
 * La fachada de noche del panel de acceso: una cuadra de edificios con sus ventanas,
 * una por unidad, que se encienden en bronce al abrir la pantalla.
 *
 * Es lo que administra quien entra (pisos y departamentos), dibujado con las
 * mismas piezas que el resto de la app: sin imágenes y con los tokens del
 * tema oscuro, porque el panel va siempre de noche, venga la app en claro u
 * oscuro.
 *
 * - Decorativa: no lleva datos ni se lee (`aria-hidden`); el titular del panel
 *   ya dice de qué se trata.
 * - Se enciende una sola vez, en poco más de un segundo. Con "reducir
 *   movimiento" aparece ya encendida.
 * - Qué ventanas se encienden es fijo (no al azar): la misma fachada cada vez.
 */
import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from "react-native";

import { temaOscuroDelProyecto as noche } from "@/tema";

interface Edificio {
  pisos: number;
  columnas: number;
}

/** Medidas del dibujo (como las de un ícono), no espacios de la interfaz. */
const ESCALAS = {
  grande: { ventana: { ancho: 18, alto: 26 }, hueco: 9, margen: 16, entre: 14 },
  chica: { ventana: { ancho: 5, alto: 7 }, hueco: 3, margen: 5, entre: 4 },
} as const;

const SILUETAS: Record<keyof typeof ESCALAS, Edificio[]> = {
  // Una cuadra: alturas y anchos distintos, como una calle de Lima.
  grande: [
    { pisos: 7, columnas: 3 },
    { pisos: 11, columnas: 4 },
    { pisos: 5, columnas: 3 },
    { pisos: 9, columnas: 2 },
  ],
  chica: [
    { pisos: 5, columnas: 3 },
    { pisos: 3, columnas: 2 },
  ],
};

/** Encendida o no, siempre igual: un patrón fijo que no parece una grilla. */
const encendida = (edificio: number, piso: number, columna: number) => (edificio * 7 + piso * 5 + columna * 3 + piso * columna) % 5 < 3;

export function Fachada({ escala = "grande" }: { escala?: keyof typeof ESCALAS }) {
  // En estado y no en ref: se lee al pintar (la interpolación de cada ventana).
  const [avance] = useState(() => new Animated.Value(0));
  const [lista, setLista] = useState(false);
  const e = ESCALAS[escala];

  useEffect(() => {
    let vigente = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reducir) => {
      if (!vigente) return;
      setLista(true);
      if (reducir) {
        avance.setValue(1);
        return;
      }
      Animated.timing(avance, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== "web",
      }).start();
    });
    return () => {
      vigente = false;
    };
  }, [avance]);

  const edificios = SILUETAS[escala];
  const total = edificios.reduce((n, b) => n + b.pisos * b.columnas, 0);
  let orden = 0;

  return (
    <View style={[s.calle, { gap: e.entre }]} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {edificios.map((b, i) => (
        <View key={i} style={[s.edificio, { padding: e.margen, gap: e.hueco }]}>
          {Array.from({ length: b.pisos }, (_, piso) => (
            <View key={piso} style={[s.piso, { gap: e.hueco }]}>
              {Array.from({ length: b.columnas }, (_, col) => {
                // Se encienden de abajo hacia arriba, como al caer la tarde.
                const turno = (orden++ + (b.pisos - piso) * 3) / (total + b.pisos * 3);
                const luz = encendida(i, piso, col);
                const opacidad = luz
                  ? avance.interpolate({ inputRange: [Math.min(turno, 0.9), Math.min(turno + 0.1, 1)], outputRange: [0, 1], extrapolate: "clamp" })
                  : 0;
                return (
                  <View key={col} style={[s.ventana, { width: e.ventana.ancho, height: e.ventana.alto }]}>
                    {luz && lista ? <Animated.View style={[StyleSheet.absoluteFill, s.luz, { opacity: opacidad }]} /> : null}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const c = noche.color;

const s = StyleSheet.create({
  calle: { flexDirection: "row", alignItems: "flex-end", borderBottomWidth: 2, borderBottomColor: c.border.strong },
  edificio: { backgroundColor: c.bg.hover, borderTopLeftRadius: noche.radius.sm, borderTopRightRadius: noche.radius.sm },
  piso: { flexDirection: "row" },
  ventana: { backgroundColor: c.bg.canvas, borderRadius: noche.radius.sm / 2, overflow: "hidden" },
  luz: { backgroundColor: c.accent.base },
});
