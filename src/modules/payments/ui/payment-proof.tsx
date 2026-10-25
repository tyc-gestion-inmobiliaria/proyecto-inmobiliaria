/**
 * El comprobante de un pago: un botón que lo abre en grande (PB-27, "foto
 * ampliable"). El bucket es privado: la dirección es firmada y dura diez
 * minutos, así que se pide al abrir, no al pintar la lista.
 *
 * Si es un PDF, o si se quiere verlo a tamaño completo, se abre aparte.
 */
import { useState } from "react";
import { Image, Linking, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { Button, Dialog, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import type { PagosPuerto } from "../application/ports";

type Vista = { estado: "cerrado" } | { estado: "abriendo" } | { estado: "listo"; url: string } | { estado: "error" };

export function VerComprobante({ pagos, ruta, unidadNumero }: { pagos: PagosPuerto; ruta: string; unidadNumero: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { height } = useWindowDimensions();
  const [vista, setVista] = useState<Vista>({ estado: "cerrado" });
  const esPdf = ruta.toLowerCase().endsWith(".pdf");

  async function abrir() {
    setVista({ estado: "abriendo" });
    const url = await pagos.urlDeComprobante(ruta).catch(() => null);
    if (!url) return setVista({ estado: "error" });
    if (esPdf) {
      await Linking.openURL(url);
      return setVista({ estado: "cerrado" });
    }
    setVista({ estado: "listo", url });
  }

  return (
    <>
      <Button
        variant="secondary"
        label="Ver comprobante"
        accessibilityLabel={`Ver el comprobante del pago de la unidad ${unidadNumero}`}
        loading={vista.estado === "abriendo"}
        onPress={abrir}
      />
      {vista.estado === "error" ? (
        <Text accessibilityRole="alert" style={textStyle(t, "caption", t.color.danger.fg)}>
          ! No se pudo abrir el comprobante. Inténtalo de nuevo.
        </Text>
      ) : null}
      <Dialog
        visible={vista.estado === "listo"}
        title={`Comprobante · Unidad ${unidadNumero}`}
        width={960}
        onClose={() => setVista({ estado: "cerrado" })}
        footer={
          vista.estado === "listo" ? (
            <Button variant="secondary" label="Abrir a tamaño completo" onPress={() => Linking.openURL(vista.url)} />
          ) : undefined
        }
      >
        {vista.estado === "listo" ? (
          <View style={[s.marco, { height: Math.max(240, height * 0.65) }]}>
            <Image
              source={{ uri: vista.url }}
              style={s.imagen}
              resizeMode="contain"
              accessibilityLabel={`Foto del comprobante de la unidad ${unidadNumero}`}
            />
          </View>
        ) : null}
      </Dialog>
    </>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    marco: { width: "100%", borderRadius: t.radius.md, backgroundColor: t.color.bg.muted, overflow: "hidden" },
    imagen: { width: "100%", height: "100%" },
  });
