/**
 * Paso 4: emitir los recibos del mes con una confirmación (PB-18).
 *
 * - Antes: el resumen, la fecha de vencimiento y el botón, que pregunta antes
 *   de emitir. Si una validación bloquea, el motivo va junto al botón.
 * - La base emite en una transacción y numera por edificio; si el botón se
 *   pulsa dos veces, no se duplica nada.
 * - Después: los recibos emitidos, cada uno con su PDF.
 */
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card, ConfirmButton, KeyValueRow, SectionTitle, TextField, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import { emitirCierre } from "../aplicacion/casos-de-uso";
import type { CobranzaPuerto } from "../aplicacion/puertos";
import type { Cierre } from "../dominio/cierre";
import { textoDeSoles } from "../dominio/dinero";
import { leerFecha, textoDeFecha, textoDePeriodo, vencimientoSugerido } from "../dominio/periodo";
import { resumenDePrevia, textoDeNumero, type FilaPrevia, type Recibo } from "../dominio/recibo";
import { descargar } from "./recibos";
import { VistaDelRecibo } from "./vista-del-recibo";

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
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [vence, setVence] = useState(textoDeFecha(vencimientoSugerido(cierre.periodo)));
  const [error, setError] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  if (cierre.estado === "emitido") {
    return (
      <View style={s.paso}>
        <Text accessibilityRole="header" style={textStyle(t, "subtitle", t.color.success.fg)}>
          {`✓ ${recibos.length} recibos emitidos${cierre.vence ? `, vencen el ${textoDeFecha(cierre.vence)}` : ""}`}
        </Text>
        {fallo ? (
          <Text accessibilityRole="alert" style={textStyle(t, "body", t.color.danger.fg)}>
            {`! ${fallo}`}
          </Text>
        ) : null}
        <View style={s.recibos}>
          {recibos.map((r) => (
            <Card key={r.id} padding="lg" style={s.recibo}>
              <VistaDelRecibo
                edificio={edificio}
                recibo={r}
                onDescargar={async () => {
                  setFallo(null);
                  if (!(await descargar(cobranza, orgId, r))) setFallo(`No se pudo preparar el PDF del ${textoDeNumero(r.numero)}.`);
                }}
              />
            </Card>
          ))}
        </View>
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
        <KeyValueRow label="Recibos" value={String(resumen.unidades)} />
        <KeyValueRow label="Total a cobrar" value={textoDeSoles(resumen.total)} strong />
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
    recibos: { flexDirection: "row", flexWrap: "wrap", gap: t.space.md },
    recibo: { flexGrow: 1, flexBasis: 280, maxWidth: 420 },
  });
