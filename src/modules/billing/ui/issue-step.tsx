/**
 * Paso 4: emitir los recibos del mes con una confirmación (PB-18).
 *
 * - Antes: el resumen, la fecha de vencimiento y el botón, que pregunta antes
 *   de emitir. Si una validación bloquea, el motivo va junto al botón.
 * - La base emite en una transacción y numera por edificio; si el botón se
 *   pulsa dos veces, no se duplica nada.
 * - Después: cuántos se emitieron, cuándo vencen y cuánto suman, y una fila
 *   por recibo que lo abre como lo recibe el propietario, con su PDF.
 */
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { FlechaDeFila } from "@/shared/ui/pieces";
import {
  Button,
  Card,
  ConfirmButton,
  DataTable,
  Dialog,
  Icon,
  SectionTitle,
  TableHead,
  TableRow,
  Td,
  TdView,
  TextField,
  Th,
  textStyle,
  useStyles,
  useTheme,
  type Tema,
} from "@/ui";

import { emitirCierre } from "../application/use-cases";
import type { CobranzaPuerto } from "../application/ports";
import type { Cierre } from "../domain/closing";
import { textoDeSoles } from "../domain/money";
import { leerFecha, textoDeFecha, textoDePeriodo, vencimientoSugerido } from "../domain/period";
import { resumenDePrevia, textoDeNumero, type FilaPrevia, type Recibo } from "../domain/receipt";
import { descargar } from "./receipts";
import { VistaDelRecibo } from "./receipt-view";

/** Por debajo de este ancho de ventana, el número del recibo va bajo la unidad. */
const ANCHO_ANGOSTO = 720;

export function PasoEmision({
  cobranza,
  orgId,
  cierre,
  edificio,
  filas,
  recibos,
  motivo,
  editable,
  onEmitido,
  correos,
}: {
  cobranza: CobranzaPuerto;
  orgId: string;
  cierre: Cierre;
  edificio: string;
  filas: FilaPrevia[];
  recibos: Recibo[];
  /** Por qué no se puede emitir, o null. */
  motivo: string | null;
  editable: boolean;
  onEmitido: () => void;
  /** El estado de los correos de los recibos, si la ruta lo pone. */
  correos?: ReactNode;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [vence, setVence] = useState(textoDeFecha(vencimientoSugerido(cierre.periodo)));
  const [error, setError] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<Recibo | null>(null);
  const angosto = useWindowDimensions().width < ANCHO_ANGOSTO;

  async function bajar(r: Recibo) {
    setFallo(null);
    if (!(await descargar(cobranza, orgId, r))) setFallo(`No se pudo preparar el PDF del ${textoDeNumero(r.numero)}.`);
  }

  if (cierre.estado === "emitido") {
    const total = recibos.reduce((n, r) => n + r.total, 0);
    return (
      <View style={s.paso}>
        <Card padding="lg" style={s.hecho}>
          <View style={s.signoHecho}>
            <Icon name="check" color={t.color.success.fg} />
          </View>
          <View style={s.textoHecho}>
            <Text accessibilityRole="header" style={textStyle(t, "subtitle")}>
              {`${recibos.length} recibos emitidos`}
            </Text>
            <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>
              {cierre.vence ? `Vencen el ${textoDeFecha(cierre.vence)}` : textoDePeriodo(cierre.periodo)}
            </Text>
          </View>
          <View style={s.totalHecho}>
            <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>Total a cobrar</Text>
            <Text style={textStyle(t, "title")}>{textoDeSoles(total)}</Text>
          </View>
        </Card>
        {correos}
        {fallo ? (
          <Text accessibilityRole="alert" style={textStyle(t, "body", t.color.danger.fg)}>
            {`! ${fallo}`}
          </Text>
        ) : null}
        <DataTable minWidth={0}>
          <TableHead>
            {angosto ? null : <Th flex={1}>Recibo</Th>}
            <Th flex={1}>Unidad</Th>
            <Th flex={1} align="right">
              Total
            </Th>
            <View style={s.colFlecha} />
          </TableHead>
          {recibos.map((r) => (
            <TableRow key={r.id} onPress={() => setAbierto(r)} accessibilityLabel={`Ver el ${textoDeNumero(r.numero)}, unidad ${r.unidadNumero}`}>
              {angosto ? (
                <TdView flex={1}>
                  <Text style={textStyle(t, "body")}>{r.unidadNumero}</Text>
                  <Text style={textStyle(t, "caption", t.color.text.secondary)}>{textoDeNumero(r.numero)}</Text>
                </TdView>
              ) : (
                <>
                  <Td flex={1} muted>
                    {textoDeNumero(r.numero)}
                  </Td>
                  <Td flex={1}>{r.unidadNumero}</Td>
                </>
              )}
              <Td flex={1} align="right" mono>
                {textoDeSoles(r.total)}
              </Td>
              <FlechaDeFila />
            </TableRow>
          ))}
        </DataTable>
        <Dialog
          visible={abierto !== null}
          title={abierto ? `Recibo de la unidad ${abierto.unidadNumero}` : undefined}
          onClose={() => setAbierto(null)}
          footer={abierto ? <Button variant="secondary" icon="download" label="Descargar PDF" onPress={() => bajar(abierto)} /> : undefined}
        >
          {abierto ? <VistaDelRecibo edificio={edificio} recibo={abierto} /> : null}
        </Dialog>
      </View>
    );
  }

  const resumen = resumenDePrevia(filas);
  const fecha = leerFecha(vence);

  async function emitir() {
    setError(null);
    if (!fecha) {
      setError("Escribe la fecha como 15/10/2026");
      return;
    }
    const r = await emitirCierre(cobranza, cierre.id, fecha);
    if (r.ok) onEmitido();
    else setError(r.mensaje);
  }

  return (
    <View style={s.paso}>
      <Card padding="lg" style={s.tarjeta}>
        <SectionTitle>{`Recibos de ${textoDePeriodo(cierre.periodo)}`}</SectionTitle>
        <View>
          <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>Total a cobrar</Text>
          <Text style={textStyle(t, "display")}>{textoDeSoles(resumen.total)}</Text>
          <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{`${resumen.unidades} recibos`}</Text>
        </View>
        {editable ? (
          <TextField
            label="Vencen el"
            required
            value={vence}
            onChangeText={(v) => {
              setVence(v);
              setError(null);
            }}
            placeholder="dd/mm/aaaa"
            helper="El día que cada recibo pasa a vencido."
            error={vence.trim() !== "" && !fecha ? "Escribe la fecha como 15/10/2026" : null}
            mono
            style={s.fecha}
            testID="cierre-vence"
          />
        ) : null}
      </Card>
      {editable ? (
        <View style={s.accion}>
          <ConfirmButton
            label={`Emitir ${resumen.unidades} recibos`}
            question={`¿Emitir los recibos de ${textoDePeriodo(cierre.periodo)}? Ya no se podrán editar.`}
            confirmLabel="Sí, emitir"
            cancelLabel="Todavía no"
            disabled={motivo !== null || !fecha || resumen.unidades === 0}
            onConfirm={emitir}
          />
          {motivo || error ? (
            <Text accessibilityRole="alert" style={[textStyle(t, "body", t.color.danger.fg), s.motivo]}>
              {`! ${error ?? motivo}`}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={textStyle(t, "body", t.color.text.secondary)}>Los recibos los emite un administrador.</Text>
      )}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    paso: { gap: t.space.lg },
    tarjeta: { gap: t.space.md, maxWidth: 640 },
    fecha: { maxWidth: 220 },
    accion: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.md },
    motivo: { flex: 1, minWidth: 220 },
    hecho: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.md },
    signoHecho: {
      width: 40,
      height: 40,
      borderRadius: t.radius.full,
      backgroundColor: t.color.success.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    textoHecho: { flex: 1, minWidth: 160, gap: t.space.xxs },
    totalHecho: { alignItems: "flex-end" },
    // El ancho de la flecha de la fila, para que las columnas caigan en el mismo sitio.
    colFlecha: { minWidth: 32 },
  });
