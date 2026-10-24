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

import { useContextoDeTrabajo } from "@/compartido/contexto/proveedor-contexto";
import { useCarga } from "@/compartido/ui/usar-carga";
import { Cargando, ConOrganizacion } from "@/modulos/organizaciones/ui/con-organizacion";
import {
  Badge,
  Button,
  Card,
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

import { aceptarPago, listarCola, rechazarPago, revertirPago } from "../aplicacion/casos-de-uso";
import type { PagosPuerto } from "../aplicacion/puertos";
import { textoDeCentimos } from "../dominio/dinero";
import { textoDeFecha } from "../dominio/formulario";
import { accionesDelPago, puedeGestionarPagos, TEXTO_DEL_ESTADO, TONO_DEL_ESTADO, type EstadoDelPago, type Pago } from "../dominio/pago";
import { VerComprobante } from "./comprobante";

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
        <View style={s.lista}>
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
        </View>
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
      <View style={s.cabeza}>
        <Text style={[textStyle(t, "body"), s.unidad]}>{conEdificio ? `${pago.edificioNombre} · Unidad ${pago.unidadNumero}` : `Unidad ${pago.unidadNumero}`}</Text>
        <Badge tone={TONO_DEL_ESTADO[pago.estado]} label={TEXTO_DEL_ESTADO[pago.estado]} />
      </View>
      <Text style={textStyle(t, "data")}>{textoDeCentimos(pago.monto)}</Text>
      <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{detalle.join(" · ")}</Text>
      {pago.motivoRechazo ? <Text style={textStyle(t, "bodySmall")}>{`Motivo: ${pago.motivoRechazo}`}</Text> : null}
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
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: 960, width: "100%" },
    lista: { gap: t.space.md },
    fila: { gap: t.space.xs },
    cabeza: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: t.space.sm },
    unidad: { fontWeight: "600", flexShrink: 1 },
    acciones: { flexDirection: "row", flexWrap: "wrap", gap: t.space.sm, marginTop: t.space.sm },
  });
