/**
 * La cola de pagos (PB-27): los reportados por validar, con su unidad, monto,
 * fecha, operación y comprobante; aceptarlos, rechazarlos con motivo, y
 * revertir uno aceptado por error desde "Validados".
 *
 * - Respeta el selector de contexto: con un edificio elegido, solo los suyos;
 *   en toda la cartera, cada pago dice de qué edificio es.
 * - El que más espera va arriba.
 * - Hecha una acción, el pago sale de la pestaña y arriba queda dicho qué
 *   pasó, con la unidad y el monto, para no perder la cuenta.
 * - El personal ve la cola sin botones: validar es del administrador.
 * - Aceptar es una acción por fila: no hay botón primario en la vista, para
 *   que ningún pago parezca "el" pago a aceptar.
 */
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useContextoDeTrabajo } from "@/shared/context/context-provider";
import { useCarga } from "@/shared/ui/use-load";
import { Cargando, ConOrganizacion } from "@/modules/organizations/ui/with-organization";
import { ANCHO_DE_PANTALLA } from "@/shared/ui/layout";
import {
  Badge,
  Button,
  Card,
  CardGrid,
  ConfirmButton,
  Dialog,
  EmptyState,
  ScreenTitle,
  Tabs,
  TextField,
  textStyle,
  useStyles,
  useTheme,
  type Tema,
} from "@/ui";

import { aceptarPago, listarCola, rechazarPago, revertirPago } from "../application/use-cases";
import type { PagosPuerto } from "../application/ports";
import { textoDeCentimos } from "../domain/money";
import { textoDeFecha } from "../domain/form";
import { accionesDelPago, puedeGestionarPagos, TEXTO_DEL_ESTADO, TONO_DEL_ESTADO, type EstadoDelPago, type Pago } from "../domain/payment";
import { VerComprobante } from "./payment-proof";

const PESTANAS: { key: EstadoDelPago; label: string }[] = [
  { key: "por_validar", label: "Por validar" },
  { key: "aceptado", label: "Validados" },
  { key: "rechazado", label: "Rechazados" },
];

const VACIO: Record<EstadoDelPago, string> = {
  por_validar: "No hay pagos por validar",
  aceptado: "No hay pagos validados",
  rechazado: "No hay pagos rechazados",
};

export function PantallaPagos({ pagos }: { pagos: PagosPuerto }) {
  return (
    <ConOrganizacion>
      {(enCurso) => <Contenido key={enCurso.orgId} pagos={pagos} orgId={enCurso.orgId} gestiona={puedeGestionarPagos(enCurso.rol)} />}
    </ConOrganizacion>
  );
}

type Aviso = { tono: "ok" | "error"; texto: string };

function Contenido({ pagos, orgId, gestiona }: { pagos: PagosPuerto; orgId: string; gestiona: boolean }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { edificio } = useContextoDeTrabajo();
  const [estado, setEstado] = useState<EstadoDelPago>("por_validar");
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [rechazando, setRechazando] = useState<Pago | null>(null);
  const edificioId = edificio?.id ?? null;
  const leer = useCallback(() => listarCola(pagos, orgId, { edificioId, estado }), [pagos, orgId, edificioId, estado]);
  const { carga, reintentar } = useCarga(leer);

  function elegir(e: EstadoDelPago) {
    setAviso(null);
    setEstado(e);
  }

  async function aceptar(p: Pago) {
    const r = await aceptarPago(pagos, p.id);
    setAviso(r.ok ? { tono: "ok", texto: `✓ Validado el pago de ${textoDeCentimos(p.monto)} de la unidad ${p.unidadNumero}.` } : { tono: "error", texto: r.mensaje });
    reintentar();
  }

  async function revertir(p: Pago) {
    const r = await revertirPago(pagos, p.id);
    setAviso(
      r.ok
        ? { tono: "ok", texto: `✓ El pago de ${textoDeCentimos(p.monto)} de la unidad ${p.unidadNumero} volvió a Por validar.` }
        : { tono: "error", texto: r.mensaje },
    );
    reintentar();
  }

  function rechazado(p: Pago) {
    setRechazando(null);
    setAviso({ tono: "ok", texto: `✓ Rechazado el pago de ${textoDeCentimos(p.monto)} de la unidad ${p.unidadNumero}.` });
    reintentar();
  }

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <ScreenTitle>Pagos</ScreenTitle>
      <Tabs accessibilityLabel="Estado de los pagos" items={PESTANAS} value={estado} onChange={elegir} />
      {aviso ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={textStyle(t, "body", aviso.tono === "ok" ? t.color.success.fg : t.color.danger.fg)}
        >
          {aviso.tono === "error" ? `! ${aviso.texto}` : aviso.texto}
        </Text>
      ) : null}
      {carga.estado === "cargando" ? <Cargando /> : null}
      {carga.estado === "error" ? (
        <EmptyState
          title="No se pudieron leer los pagos"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      ) : null}
      {carga.estado === "listo" && carga.valor.length === 0 ? <EmptyState title={VACIO[estado]} /> : null}
      {carga.estado === "listo" && carga.valor.length > 0 ? (
        <CardGrid minItemWidth={480}>
          {carga.valor.map((p) => (
            <FilaDePago
              key={p.id}
              pago={p}
              pagos={pagos}
              conEdificio={edificioId === null}
              gestiona={gestiona}
              onAceptar={() => aceptar(p)}
              onRechazar={() => setRechazando(p)}
              onRevertir={() => revertir(p)}
            />
          ))}
        </CardGrid>
      ) : null}
      {rechazando ? <Rechazo pagos={pagos} pago={rechazando} onCerrar={() => setRechazando(null)} onHecho={() => rechazado(rechazando)} /> : null}
    </ScrollView>
  );
}

function FilaDePago({
  pago,
  pagos,
  conEdificio,
  gestiona,
  onAceptar,
  onRechazar,
  onRevertir,
}: {
  pago: Pago;
  pagos: PagosPuerto;
  conEdificio: boolean;
  gestiona: boolean;
  onAceptar: () => Promise<void>;
  onRechazar: () => void;
  onRevertir: () => Promise<void>;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [enCurso, setEnCurso] = useState(false);
  const acciones = gestiona ? accionesDelPago(pago.estado) : [];
  const detalle = [
    `Pagó el ${textoDeFecha(pago.fecha)}`,
    pago.operacion ? `Operación ${pago.operacion}` : "Sin número de operación",
    pago.cuenta ? `${pago.cuenta.banco} ${pago.cuenta.numero}` : null,
    pago.origen === "registrado" ? "Registrado por la administración" : null,
  ].filter((x): x is string => x !== null);

  async function aceptar() {
    setEnCurso(true);
    await onAceptar();
    setEnCurso(false);
  }

  return (
    <Card padding="lg" style={s.fila}>
      {/* Quién y de dónde a la izquierda; el monto, que es lo que se valida, grande a la derecha. */}
      <View style={s.cabeza}>
        <View style={s.quien}>
          <Text style={textStyle(t, "subtitle")}>{`Unidad ${pago.unidadNumero}`}</Text>
          {conEdificio ? <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{pago.edificioNombre}</Text> : null}
        </View>
        <View style={s.cuanto}>
          <Text style={textStyle(t, "title")}>{textoDeCentimos(pago.monto)}</Text>
          <Badge tone={TONO_DEL_ESTADO[pago.estado]} label={TEXTO_DEL_ESTADO[pago.estado]} />
        </View>
      </View>
      <View style={s.detalle}>
        {detalle.map((d) => (
          <Text key={d} style={textStyle(t, "bodySmall", t.color.text.secondary)}>
            {d}
          </Text>
        ))}
      </View>
      {pago.motivoRechazo ? <Text style={textStyle(t, "bodySmall", t.color.danger.fg)}>{`! Motivo: ${pago.motivoRechazo}`}</Text> : null}
      {pago.comprobante || acciones.length > 0 ? (
        <View style={s.acciones}>
          {pago.comprobante ? <VerComprobante pagos={pagos} ruta={pago.comprobante} unidadNumero={pago.unidadNumero} /> : null}
          {acciones.includes("aceptar") ? (
            <Button
              variant="secondary"
              label="✓ Aceptar"
              accessibilityLabel={`Aceptar el pago de ${textoDeCentimos(pago.monto)} de la unidad ${pago.unidadNumero}`}
              loading={enCurso}
              onPress={aceptar}
            />
          ) : null}
          {acciones.includes("rechazar") ? (
            <Button
              variant="ghost"
              label="Rechazar…"
              accessibilityLabel={`Rechazar el pago de la unidad ${pago.unidadNumero}`}
              disabled={enCurso}
              onPress={onRechazar}
            />
          ) : null}
          {acciones.includes("revertir") ? (
            <ConfirmButton
              size="md"
              label="Revertir"
              question="¿Volver este pago a Por validar?"
              confirmLabel="Sí, revertir"
              accessibilityLabel={`Revertir el pago de la unidad ${pago.unidadNumero}`}
              onConfirm={onRevertir}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function Rechazo({ pagos, pago, onCerrar, onHecho }: { pagos: PagosPuerto; pago: Pago; onCerrar: () => void; onHecho: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [general, setGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function rechazar() {
    if (enviando) return;
    setEnviando(true);
    setGeneral(null);
    const r = await rechazarPago(pagos, pago.id, motivo);
    setEnviando(false);
    if (r.ok) return onHecho();
    if ("errorDelMotivo" in r) return setError(r.errorDelMotivo);
    setGeneral(r.mensaje);
  }

  return (
    <Dialog
      visible
      title={`Rechazar el pago de la unidad ${pago.unidadNumero}`}
      onClose={onCerrar}
      footer={
        <>
          <Button variant="secondary" label="Cancelar" onPress={onCerrar} disabled={enviando} />
          <Button variant="danger" label="Rechazar pago" onPress={rechazar} loading={enviando} />
        </>
      }
    >
      <TextField
        label="Motivo"
        required
        multiline
        autoFocus
        value={motivo}
        onChangeText={(v) => {
          setMotivo(v);
          if (error) setError(null);
        }}
        placeholder="Ej.: la operación no aparece en el banco"
        helper="El residente lo va a leer."
        error={error}
      />
      {general ? <Alerta texto={general} /> : null}
    </Dialog>
  );
}

function Alerta({ texto }: { texto: string }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={textStyle(t, "bodySmall", t.color.danger.fg)}>
      {`! ${texto}`}
    </Text>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: ANCHO_DE_PANTALLA, width: "100%" },
    // En pantalla ancha, dos tarjetas por fila (`CardGrid`); en el teléfono, una.
    fila: { flexGrow: 1, gap: t.space.md },
    cabeza: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: t.space.md },
    quien: { flexShrink: 1, gap: t.space.xxs },
    cuanto: { alignItems: "flex-end", gap: t.space.xs },
    detalle: { flexDirection: "row", flexWrap: "wrap", columnGap: t.space.lg, rowGap: t.space.xxs },
    acciones: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: t.space.sm,
      paddingTop: t.space.md,
      borderTopWidth: 1,
      borderTopColor: t.color.border.subtle,
    },
  });
