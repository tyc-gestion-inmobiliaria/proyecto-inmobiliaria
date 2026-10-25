/**
 * Paso 3: revisar los recibos antes de emitir (PB-16, PB-17).
 *
 * - Las validaciones se recalculan con cada cambio y cada una dice su estado
 *   con texto, su causa y la acción que la resuelve.
 * - La tabla Unidad · Cuota · Consumo · Deuda previa · Total · Alerta viene de
 *   la base; la alerta va en su fila con signo y texto. "Solo con alerta"
 *   deja las que piden atención.
 * - Tocar una fila abre el recibo tal como lo recibirá el propietario.
 */
import { useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import {
  Badge,
  Card,
  ChoiceChips,
  DataTable,
  Dialog,
  KeyValueRow,
  SectionTitle,
  TableHead,
  TableRow,
  Td,
  TdView,
  Th,
  Button,
  textStyle,
  useStyles,
  useTheme,
  type StatusTone,
  type Tema,
} from "@/ui";

import type { Cierre } from "../domain/closing";
import { textoDeSoles } from "../domain/money";
import { textoDeMetros } from "../domain/reading";
import { alertasDeFila, resumenDePrevia, type FilaPrevia } from "../domain/receipt";
import type { DestinoDeAccion, Validacion } from "../domain/validations";
import { VistaDelRecibo } from "./receipt-view";

const ANCHO_ANGOSTO = 720;
/** Desde este ancho, las validaciones y el total van lado a lado. */
const ANCHO_DOS_COLUMNAS = 1100;

const ESTADO: Record<Validacion["estado"], { texto: string; tono: StatusTone }> = {
  ok: { texto: "Bien", tono: "success" },
  falla: { texto: "Bloquea", tono: "danger" },
  aviso: { texto: "Aviso", tono: "warning" },
};

export function ListaDeValidaciones({ validaciones, onAccion }: { validaciones: Validacion[]; onAccion: (d: DestinoDeAccion) => void }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <Card padding="lg" style={s.tarjeta}>
      <SectionTitle>Validaciones</SectionTitle>
      {validaciones.map((v) => (
        <View key={v.clave} style={s.validacion}>
          <Badge tone={ESTADO[v.estado].tono} label={`${v.estado === "ok" ? "✓" : "!"} ${ESTADO[v.estado].texto}`} />
          <View style={s.texto}>
            <Text style={textStyle(t, "body")}>{v.titulo}</Text>
            <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{v.causa}</Text>
          </View>
          {v.accion ? <Button variant="ghost" size="sm" label={v.accion.texto} onPress={() => onAccion(v.accion!.destino)} /> : null}
        </View>
      ))}
    </Card>
  );
}

export function PasoRevision({
  cierre,
  edificio,
  filas,
  validaciones,
  soloAlertaAlAbrir,
  onAccion,
}: {
  cierre: Cierre;
  edificio: string;
  filas: FilaPrevia[];
  validaciones: Validacion[];
  soloAlertaAlAbrir?: boolean;
  onAccion: (d: DestinoDeAccion) => void;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  const angosto = width < ANCHO_ANGOSTO;
  const ancho = width >= ANCHO_DOS_COLUMNAS;
  const [filtro, setFiltro] = useState<"todas" | "alerta">(soloAlertaAlAbrir ? "alerta" : "todas");
  const [abierta, setAbierta] = useState<FilaPrevia | null>(null);
  const resumen = resumenDePrevia(filas);
  const visibles = filtro === "alerta" ? filas.filter((f) => alertasDeFila(f).length > 0) : filas;

  const alerta = (f: FilaPrevia) => {
    const a = alertasDeFila(f);
    return a.length === 0 ? "—" : a.map((x) => `⚠ ${x.texto}`).join(" · ");
  };

  return (
    <View style={s.paso}>
      <View style={ancho ? s.columnas : s.paso}>
        <View style={ancho ? s.principal : undefined}>
          <ListaDeValidaciones validaciones={validaciones} onAccion={onAccion} />
        </View>
        {/* El total va primero y grande: es la cifra que se revisa antes de emitir. */}
        <Card padding="lg" style={[s.tarjeta, ancho ? s.lateral : undefined]}>
          <Text style={textStyle(t, "body", t.color.text.secondary)}>Total a cobrar</Text>
          <Text style={textStyle(t, "display")}>{textoDeSoles(resumen.total)}</Text>
          <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{`${resumen.unidades} recibos`}</Text>
          <View style={s.linea} />
          <KeyValueRow label="Cuotas" value={textoDeSoles(resumen.cuotas)} />
          <KeyValueRow label="Agua" value={textoDeSoles(resumen.agua)} />
          <KeyValueRow label="Deuda previa" value={textoDeSoles(resumen.deudaPrevia)} />
        </Card>
      </View>

      <ChoiceChips
        accessibilityLabel="Qué unidades mostrar"
        value={filtro}
        onChange={(v) => v && setFiltro(v)}
        options={[
          { id: "todas", label: `Todas (${filas.length})` },
          { id: "alerta", label: `Solo con alerta (${resumen.conAlerta})` },
        ]}
      />

      <DataTable minWidth={angosto ? 0 : 680}>
        {angosto ? null : (
          <TableHead>
            <Th flex={1}>Unidad</Th>
            <Th flex={1} align="right">
              Cuota
            </Th>
            <Th flex={1} align="right">
              Consumo
            </Th>
            <Th flex={1} align="right">
              Deuda previa
            </Th>
            <Th flex={1} align="right">
              Total
            </Th>
            <Th flex={2}>Alerta</Th>
          </TableHead>
        )}
        {visibles.map((f) =>
          angosto ? (
            <TableRow key={f.unidadId} onPress={() => setAbierta(f)} accessibilityLabel={`Ver el recibo de la unidad ${f.unidadNumero}`}>
              <TdView flex={1}>
                <Text style={textStyle(t, "subtitle")}>{f.unidadNumero}</Text>
                <Text style={textStyle(t, "data")}>{`Total ${textoDeSoles(f.total)}`}</Text>
                <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>
                  {`Cuota ${textoDeSoles(f.cuota)} · Agua ${textoDeSoles(f.agua)} · Deuda ${textoDeSoles(f.deudaPrevia)}`}
                </Text>
                {alertasDeFila(f).length > 0 ? <Text style={textStyle(t, "bodySmall", t.color.warning.fg)}>{alerta(f)}</Text> : null}
              </TdView>
              <Text aria-hidden style={[textStyle(t, "label", t.color.accent.text), s.flecha]}>
                Ver ›
              </Text>
            </TableRow>
          ) : (
            <TableRow key={f.unidadId} onPress={() => setAbierta(f)} accessibilityLabel={`Ver el recibo de la unidad ${f.unidadNumero}`}>
              <Td flex={1}>{f.unidadNumero}</Td>
              <Td flex={1} align="right" mono>
                {textoDeSoles(f.cuota)}
              </Td>
              <Td flex={1} align="right" mono muted={f.consumo === null}>
                {textoDeMetros(f.consumo)}
              </Td>
              <Td flex={1} align="right" mono>
                {textoDeSoles(f.deudaPrevia)}
              </Td>
              <Td flex={1} align="right" mono>
                {textoDeSoles(f.total)}
              </Td>
              <TdView flex={2}>
                <Text style={textStyle(t, "bodySmall", alertasDeFila(f).length > 0 ? t.color.warning.fg : t.color.text.tertiary)}>{alerta(f)}</Text>
              </TdView>
            </TableRow>
          ),
        )}
      </DataTable>
      {visibles.length === 0 ? <Text style={textStyle(t, "body", t.color.text.secondary)}>Ninguna unidad tiene alertas.</Text> : null}

      <Dialog visible={abierta !== null} title={abierta ? `Recibo de la unidad ${abierta.unidadNumero}` : undefined} onClose={() => setAbierta(null)}>
        {abierta ? <VistaDelRecibo edificio={edificio} recibo={{ ...abierta, periodo: cierre.periodo, vence: cierre.vence }} /> : null}
      </Dialog>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    paso: { gap: t.space.lg },
    tarjeta: { gap: t.space.md },
    columnas: { flexDirection: "row", alignItems: "flex-start", gap: t.space.lg },
    principal: { flex: 1, minWidth: 0 },
    lateral: { flexBasis: 320, flexGrow: 0, flexShrink: 0, gap: t.space.sm },
    linea: { height: 1, backgroundColor: t.color.border.subtle, marginVertical: t.space.xs },
    validacion: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.md },
    texto: { flex: 1, minWidth: 200, gap: t.space.xxs },
    flecha: { width: 48, textAlign: "right" },
  });
