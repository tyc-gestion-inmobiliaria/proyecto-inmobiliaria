/**
 * El recibo tal como lo recibe el propietario (PB-16): en la vista previa del
 * paso 3 y en la lista de recibos emitidos. Con `onDescargar`, el botón del PDF.
 */
import { StyleSheet, Text, View } from "react-native";

import { Button, KeyValueRow, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import { textoDeSoles } from "../domain/money";
import { textoDeMetros } from "../domain/reading";
import { textoCortoDePeriodo, textoDeFecha, type Periodo } from "../domain/period";
import { alertasDeFila, textoDeNumero } from "../domain/receipt";

export interface DatosDeLaVista {
  numero?: number;
  unidadNumero: string;
  periodo: Periodo;
  vence: string | null;
  consumo: number | null;
  cuota: number;
  agua: number;
  deudaPrevia: number;
  total: number;
  sinLectura?: boolean;
  atipico?: boolean;
}

export function VistaDelRecibo({
  recibo,
  edificio,
  onDescargar,
}: {
  recibo: DatosDeLaVista;
  edificio: string;
  onDescargar?: () => void;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const alertas = alertasDeFila({ sinLectura: recibo.sinLectura ?? false, atipico: recibo.atipico ?? false });
  return (
    <View style={s.recibo}>
      <Text style={textStyle(t, "caption", t.color.text.secondary)}>
        {[edificio, recibo.numero ? textoDeNumero(recibo.numero) : "Vista previa"].join(" · ")}
      </Text>
      <KeyValueRow label="Unidad" value={recibo.unidadNumero} />
      <KeyValueRow label="Periodo" value={textoCortoDePeriodo(recibo.periodo)} />
      {recibo.vence ? <KeyValueRow label="Vence" value={textoDeFecha(recibo.vence)} /> : null}
      <KeyValueRow label="Consumo de agua" value={textoDeMetros(recibo.consumo)} />
      <View style={s.linea} />
      <KeyValueRow label="Cuota de mantenimiento" value={textoDeSoles(recibo.cuota)} />
      <KeyValueRow label="Agua" value={textoDeSoles(recibo.agua)} />
      <KeyValueRow label="Deuda anterior" value={textoDeSoles(recibo.deudaPrevia)} />
      <KeyValueRow label="Total a pagar" value={textoDeSoles(recibo.total)} strong />
      {alertas.map((a) => (
        <Text key={a.tipo} style={textStyle(t, "bodySmall", t.color.warning.fg)}>
          {`⚠ ${a.texto}`}
        </Text>
      ))}
      {onDescargar ? (
        <View style={s.boton}>
          <Button variant="secondary" label="Descargar PDF" onPress={onDescargar} />
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    recibo: { gap: t.space.sm },
    linea: { height: 1, backgroundColor: t.color.border.subtle, marginVertical: t.space.xs },
    boton: { alignSelf: "flex-start", marginTop: t.space.sm },
  });
