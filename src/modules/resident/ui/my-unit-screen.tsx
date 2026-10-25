/**
 * El Inicio del residente (PB-25, PB-26): lo que debe de su unidad, sus
 * recibos y sus pagos, y avisar que pagó.
 *
 * - **Primero, cuánto debe**, grande, con cuándo vence y lo que ya reportó y
 *   espera validación: es la pregunta con la que abre la app.
 * - **"Reportar pago"** es la acción principal, junto al título.
 * - **Varias unidades:** se elige arriba y queda a la vista cuál es.
 * - **Recibos:** uno por tarjeta, con su estado en palabras y su PDF.
 * - **Pagos:** cada uno con su estado ("Por validar", "Validado",
 *   "Rechazado") y, si se rechazó, el motivo que escribió la administración.
 *
 * El portal no tiene datos propios: orquesta la cobranza (estado de cuenta)
 * y los pagos. Lo que es pantalla de otro módulo (reportar, el PDF) lo pone
 * la ruta.
 */
import { useCallback, useState, type ComponentType } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useCarga } from "@/shared/ui/use-load";
import { estadoDeCuenta, type EstadoDeCuenta } from "@/modules/billing/application/use-cases";
import type { CobranzaPuerto } from "@/modules/billing/application/ports";
import { textoDeSoles } from "@/modules/billing/domain/money";
import { hoyEnLima, textoCortoDePeriodo, textoDeFecha } from "@/modules/billing/domain/period";
import { cargosDeLaUnidad, estadoDelCargo, TEXTO_DEL_ESTADO as TEXTO_DEL_CARGO, textoDeNumero, type Recibo } from "@/modules/billing/domain/receipt";
import { Cargando, ConOrganizacion } from "@/modules/organizations/ui/with-organization";
import { pagosDeLaUnidad } from "@/modules/payments/application/use-cases";
import type { PagosPuerto } from "@/modules/payments/application/ports";
import { textoDeCentimos } from "@/modules/payments/domain/money";
import { textoDeFecha as textoDeFechaDelPago } from "@/modules/payments/domain/form";
import { TEXTO_DEL_ESTADO as TEXTO_DEL_PAGO, TONO_DEL_ESTADO, type Pago } from "@/modules/payments/domain/payment";
import {
  Badge,
  Button,
  Card,
  ChoiceChips,
  DataTable,
  EmptyState,
  FieldLabel,
  KeyValueRow,
  PageHeader,
  SectionTitle,
  TableRow,
  TdView,
  textStyle,
  useStyles,
  useTheme,
  type StatusTone,
  type Tema,
} from "@/ui";

import type { ResidentePuerto } from "../application/ports";
import { nombreDeMiUnidad, unidadElegida, type MiUnidad } from "../domain/my-unit";

const TONO_DEL_CARGO: Record<ReturnType<typeof estadoDelCargo>, StatusTone> = { "por-vencer": "warning", vencido: "danger", pagado: "success" };

export interface PropsDeReportar {
  orgId: string;
  edificioId: string;
  unidadId: string;
  unidadNumero: string;
  onCerrar: () => void;
  onReportado: () => void;
}

interface Props {
  residente: ResidentePuerto;
  cobranza: CobranzaPuerto;
  pagos: PagosPuerto;
  /** El formulario para reportar un pago, que es de los pagos. */
  Reportar: ComponentType<PropsDeReportar>;
  /** Prepara el PDF del recibo; `false` si no se pudo. */
  descargar: (orgId: string, recibo: Recibo) => Promise<boolean>;
}

export function PantallaMiUnidad(props: Props) {
  return <ConOrganizacion>{(enCurso) => <MisUnidades key={enCurso.orgId} orgId={enCurso.orgId} {...props} />}</ConOrganizacion>;
}

function MisUnidades({ orgId, residente, ...resto }: Props & { orgId: string }) {
  const s = useStyles(makeStyles);
  const leer = useCallback(() => residente.misUnidades(orgId), [residente, orgId]);
  const { carga, reintentar } = useCarga(leer);
  const [elegida, setElegida] = useState<string | null>(null);

  if (carga.estado === "cargando") return <Cargando />;
  if (carga.estado === "error") {
    return (
      <ScrollView contentContainerStyle={s.pantalla}>
        <EmptyState
          icon="refresh-cw"
          title="No se pudo leer tu unidad"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      </ScrollView>
    );
  }
  const unidad = unidadElegida(carga.valor, elegida);
  if (!unidad) {
    return (
      <ScrollView contentContainerStyle={s.pantalla}>
        <EmptyState
          icon="door"
          title="Tu cuenta no tiene una unidad todavía"
          description="Pide a la administración que te vincule a tu unidad."
        />
      </ScrollView>
    );
  }
  return <MiUnidadEnCurso key={unidad.id} orgId={orgId} unidad={unidad} unidades={carga.valor} elegir={setElegida} {...resto} />;
}

function MiUnidadEnCurso({
  orgId,
  unidad,
  unidades,
  elegir,
  cobranza,
  pagos,
  Reportar,
  descargar,
}: Omit<Props, "residente"> & { orgId: string; unidad: MiUnidad; unidades: MiUnidad[]; elegir: (id: string) => void }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const hoy = hoyEnLima();
  const leer = useCallback(
    () => Promise.all([estadoDeCuenta(cobranza, orgId, unidad.id, hoy), pagosDeLaUnidad(pagos, orgId, unidad.id)]),
    [cobranza, pagos, orgId, unidad.id, hoy],
  );
  const { carga, reintentar } = useCarga(leer);
  const [reportando, setReportando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const cabecera = (
    <>
      <PageHeader
        title={`Unidad ${unidad.numero}`}
        status={carga.estado === "listo" ? <Badge tone={carga.valor[0].estado.tono} label={carga.valor[0].estado.texto} /> : null}
        actions={<Button label="Reportar pago" icon="plus" onPress={() => setReportando(true)} testID="residente-reportar" />}
      />
      {unidades.length > 1 ? (
        <View style={s.elegir}>
          <FieldLabel>Tus unidades</FieldLabel>
          <ChoiceChips
            accessibilityLabel="Tus unidades"
            value={unidad.id}
            onChange={(id) => id && elegir(id)}
            options={unidades.map((u) => ({ id: u.id, label: nombreDeMiUnidad(u) }))}
          />
        </View>
      ) : (
        <Text style={textStyle(t, "body", t.color.text.secondary)}>{unidad.edificioNombre}</Text>
      )}
    </>
  );

  let contenido;
  if (carga.estado === "cargando") contenido = <Cargando />;
  else if (carga.estado === "error") {
    contenido = (
      <EmptyState
        icon="refresh-cw"
        title="No se pudo leer tu estado de cuenta"
        description="Revisa tu conexión y vuelve a intentarlo."
        action={<Button label="Reintentar" onPress={reintentar} />}
      />
    );
  } else {
    const [cuenta, misPagos] = carga.valor;
    contenido = (
      <>
        <Saldo cuenta={cuenta} hoy={hoy} />
        {aviso ? (
          <Text accessibilityRole="alert" style={textStyle(t, "body", t.color.success.fg)}>
            {`✓ ${aviso}`}
          </Text>
        ) : null}
        <Recibos orgId={orgId} cuenta={cuenta} hoy={hoy} descargar={descargar} />
        <MisPagos pagos={misPagos} />
      </>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      {cabecera}
      {contenido}
      {reportando ? (
        <Reportar
          orgId={orgId}
          edificioId={unidad.edificioId}
          unidadId={unidad.id}
          unidadNumero={unidad.numero}
          onCerrar={() => setReportando(false)}
          onReportado={() => {
            setReportando(false);
            setAviso("Pago enviado. Queda por validar hasta que la administración lo revise.");
            reintentar();
          }}
        />
      ) : null}
    </ScrollView>
  );
}

/** Cuánto debe, cuándo vence lo más viejo que falta pagar y lo que espera validación. */
function Saldo({ cuenta, hoy }: { cuenta: EstadoDeCuenta; hoy: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const pendiente = [...cuenta.recibos].filter((r) => estadoDelCargo(r, hoy) !== "pagado").sort((a, b) => a.vence.localeCompare(b.vence))[0];
  const titulo = cuenta.saldo > 0 ? "Debes" : cuenta.saldo < 0 ? "Saldo a favor" : "Estás al día";
  return (
    <Card padding="lg" style={s.saldo}>
      <Text style={textStyle(t, "body", t.color.text.secondary)}>{titulo}</Text>
      {cuenta.saldo !== 0 ? (
        <Text style={textStyle(t, "display", cuenta.estado.tono === "danger" ? t.color.danger.fg : t.color.text.primary)} testID="residente-saldo">
          {textoDeSoles(Math.abs(cuenta.saldo))}
        </Text>
      ) : null}
      {pendiente && cuenta.saldo > 0 ? (
        <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>
          {`${hoy > pendiente.vence ? "Venció" : "Vence"} el ${textoDeFecha(pendiente.vence)}`}
        </Text>
      ) : null}
      {cuenta.porValidar > 0 ? (
        <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{`${textoDeSoles(cuenta.porValidar)} en pagos por validar`}</Text>
      ) : null}
    </Card>
  );
}

function Recibos({
  orgId,
  cuenta,
  hoy,
  descargar,
}: {
  orgId: string;
  cuenta: EstadoDeCuenta;
  hoy: string;
  descargar: Props["descargar"];
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [fallo, setFallo] = useState<string | null>(null);
  const cargos = cargosDeLaUnidad(cuenta.recibos, hoy);
  const recibos = [...new Set(cargos.map((c) => c.reciboId))].map((id) => cuenta.recibos.find((r) => r.id === id) as Recibo);

  return (
    <View style={s.seccion}>
      <SectionTitle>Recibos</SectionTitle>
      {recibos.length === 0 ? (
        <Text style={textStyle(t, "body", t.color.text.secondary)}>Todavía no hay recibos de esta unidad.</Text>
      ) : null}
      {fallo ? (
        <Text accessibilityRole="alert" style={textStyle(t, "body", t.color.danger.fg)}>
          {`! ${fallo}`}
        </Text>
      ) : null}
      {recibos.map((r) => {
        const estado = estadoDelCargo(r, hoy);
        return (
          <Card key={r.id} padding="lg" style={s.recibo}>
            <View style={s.cabeza}>
              <View style={s.titulo}>
                <Text style={textStyle(t, "subtitle")}>{textoCortoDePeriodo(r.periodo)}</Text>
                <Text style={textStyle(t, "caption", t.color.text.secondary)}>{`${textoDeNumero(r.numero)} · vence el ${textoDeFecha(r.vence)}`}</Text>
              </View>
              <View style={s.total}>
                <Text style={[textStyle(t, "data"), s.fuerte]}>{textoDeSoles(r.cuota + r.agua)}</Text>
                <Badge tone={TONO_DEL_CARGO[estado]} label={TEXTO_DEL_CARGO[estado]} />
              </View>
            </View>
            {cargos
              .filter((c) => c.reciboId === r.id)
              .map((c) => (
                <KeyValueRow key={c.concepto} label={c.concepto} value={textoDeSoles(c.monto)} muted />
              ))}
            <Button
              variant="ghost"
              size="sm"
              icon="download"
              label="Descargar PDF"
              accessibilityLabel={`Descargar en PDF el recibo de ${textoCortoDePeriodo(r.periodo)}`}
              onPress={async () => {
                setFallo(null);
                if (!(await descargar(orgId, r))) setFallo("No se pudo preparar el PDF. Inténtalo de nuevo.");
              }}
              style={s.descargar}
            />
          </Card>
        );
      })}
    </View>
  );
}

function MisPagos({ pagos }: { pagos: Pago[] }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  if (pagos.length === 0) return null;
  return (
    <View style={s.seccion}>
      <SectionTitle>Tus pagos</SectionTitle>
      <DataTable minWidth={0}>
        {pagos.map((p) => (
          <TableRow key={p.id}>
            <TdView flex={1} style={s.pago}>
              <Text style={[textStyle(t, "data"), s.fuerte]}>{textoDeCentimos(p.monto)}</Text>
              <Text style={textStyle(t, "caption", t.color.text.secondary)}>
                {[textoDeFechaDelPago(p.fecha), p.operacion ? `Operación ${p.operacion}` : null].filter(Boolean).join(" · ")}
              </Text>
              {p.estado === "rechazado" && p.motivoRechazo ? (
                <Text style={textStyle(t, "caption", t.color.danger.fg)}>{`! ${p.motivoRechazo}`}</Text>
              ) : null}
            </TdView>
            <Badge tone={TONO_DEL_ESTADO[p.estado]} label={TEXTO_DEL_PAGO[p.estado]} />
          </TableRow>
        ))}
      </DataTable>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: 720, width: "100%" },
    elegir: { gap: t.space.xs },
    saldo: { gap: t.space.xs },
    seccion: { gap: t.space.md },
    recibo: { gap: t.space.sm },
    cabeza: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: t.space.md },
    titulo: { gap: t.space.xxs },
    total: { alignItems: "flex-end", gap: t.space.xs },
    fuerte: { fontWeight: "700" },
    descargar: { alignSelf: "flex-start", marginLeft: -t.space.md },
    pago: { gap: t.space.xxs },
  });
