/**
 * Los correos de los recibos de un cierre emitido (PB-30): cuántos salieron
 * y, uno por uno, los que no van a salir solos (sin correo, o que fallaron
 * cinco veces), con el motivo, para arreglarlo en el padrón.
 *
 * La cobranza no sabe de correos: la ruta pone esta pieza en el paso Emitir.
 */
import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useCarga } from "@/shared/ui/use-load";
import { Badge, Card, DataTable, SectionTitle, StatusDot, TableRow, TdView, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import type { NotificacionesPuerto } from "../application/ports";
import { resumenDeEnvios, TEXTO_DEL_ESTADO } from "../domain/delivery";

export function CorreosDelCierre({ notificaciones, orgId, cierreId }: { notificaciones: NotificacionesPuerto; orgId: string; cierreId: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const leer = useCallback(() => notificaciones.delCierre(orgId, cierreId), [notificaciones, orgId, cierreId]);
  const { carga } = useCarga(leer);

  if (carga.estado === "cargando") return null;
  if (carga.estado === "error") {
    return (
      <Text accessibilityRole="alert" style={textStyle(t, "body", t.color.warning.fg)}>
        ⚠ No se pudo leer el estado de los correos.
      </Text>
    );
  }
  const r = resumenDeEnvios(carga.valor);
  if (r.total === 0) return null;

  return (
    <Card padding="lg" style={s.tarjeta}>
      <SectionTitle>Correos a los propietarios</SectionTitle>
      <View style={s.cuentas}>
        <StatusDot tone="success" label={`${r.enviados} ${r.enviados === 1 ? "enviado" : "enviados"}`} />
        {r.porEnviar > 0 ? <StatusDot tone="info" label={`${r.porEnviar} por enviar`} /> : null}
        {r.conProblema.length > 0 ? <StatusDot tone="warning" label={`${r.conProblema.length} sin enviar`} /> : null}
      </View>
      {r.conProblema.length > 0 ? (
        <DataTable minWidth={0}>
          {r.conProblema.map((e) => (
            <TableRow key={e.id}>
              <TdView flex={1} style={s.fila}>
                <Text style={[textStyle(t, "body"), s.fuerte]}>{`Unidad ${e.unidad}${e.destinatario ? ` · ${e.destinatario}` : ""}`}</Text>
                {e.motivo ? <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{e.motivo}</Text> : null}
              </TdView>
              <Badge tone="warning" label={TEXTO_DEL_ESTADO[e.estado]} />
            </TableRow>
          ))}
        </DataTable>
      ) : null}
    </Card>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    tarjeta: { gap: t.space.md },
    cuentas: { flexDirection: "row", flexWrap: "wrap", columnGap: t.space.lg, rowGap: t.space.xs },
    fila: { gap: t.space.xxs },
    fuerte: { fontWeight: "600" },
  });
