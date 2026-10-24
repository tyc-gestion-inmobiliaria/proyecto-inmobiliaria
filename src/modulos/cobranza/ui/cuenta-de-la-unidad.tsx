/**
 * Lo que la cobranza pone en la ficha de la unidad (PB-19, PB-20): el estado
 * en palabras para el título, el saldo en el Resumen y la pestaña Estado de
 * cuenta con cada concepto, su periodo, su monto y su estado en texto.
 *
 * Sin recibos emitidos, la pestaña no aparece: no hay pestañas vacías.
 */
import { useCallback, useState, type ReactNode } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useCarga } from "@/compartido/ui/usar-carga";
import {
  Badge,
  Button,
  Card,
  DataTable,
  KeyValueRow,
  SectionTitle,
  TableHead,
  TableRow,
  Td,
  TdView,
  Th,
  textStyle,
  useStyles,
  useTheme,
  type StatusTone,
  type Tema,
} from "@/ui";

import { estadoDeCuenta, type EstadoDeCuenta } from "../aplicacion/casos-de-uso";
import type { CobranzaPuerto } from "../aplicacion/puertos";
import { textoDeSoles } from "../dominio/dinero";
import { hoyEnLima, textoCortoDePeriodo, textoDeFecha } from "../dominio/periodo";
import { cargosDeLaUnidad, TEXTO_DEL_ESTADO, textoDeNumero, type EstadoDelCargo, type Recibo } from "../dominio/recibo";
import { descargar } from "./recibos";

const ANCHO_ANGOSTO = 640;

const TONO: Record<EstadoDelCargo, StatusTone> = { "por-vencer": "warning", vencido: "danger", pagado: "success" };

export interface CuentaParaLaFicha {
  estado?: { texto: string; tono: StatusTone };
  resumen?: ReactNode;
  pestanas: { key: string; label: string; contenido: ReactNode }[];
}

export function CuentaDeLaUnidad({
  cobranza,
  orgId,
  unidadId,
  version = 0,
  children,
}: {
  cobranza: CobranzaPuerto;
  orgId: string;
  unidadId: string;
  /** Al cambiar (se registró un pago), la cuenta se vuelve a leer. */
  version?: number;
  children: (cuenta: CuentaParaLaFicha) => ReactNode;
}) {
  const hoy = hoyEnLima();
  // `version` no se usa adentro: está para que la lectura se repita al cambiar.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const leer = useCallback(() => estadoDeCuenta(cobranza, orgId, unidadId, hoy), [cobranza, orgId, unidadId, hoy, version]);
  const { carga } = useCarga(leer);

  // Si no se pudo leer, la ficha sigue: el padrón se muestra igual y la cuenta avisa.
  if (carga.estado === "cargando") return <>{children({ pestanas: [] })}</>;
  if (carga.estado === "error") {
    return (
      <>
        {children({
          pestanas: [],
          resumen: <Aviso texto="No se pudo leer el estado de cuenta. Revisa tu conexión y vuelve a abrir la unidad." />,
        })}
      </>
    );
  }
  const cuenta = carga.valor;
  return (
    <>
      {children({
        estado: cuenta.estado,
        resumen: <Resumen cuenta={cuenta} />,
        pestanas:
          cuenta.recibos.length > 0
            ? [{ key: "cuenta", label: "Estado de cuenta", contenido: <Tabla cobranza={cobranza} orgId={orgId} cuenta={cuenta} hoy={hoy} /> }]
            : [],
      })}
    </>
  );
}

function Aviso({ texto }: { texto: string }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="alert" style={textStyle(t, "body", t.color.warning.fg)}>
      {`⚠ ${texto}`}
    </Text>
  );
}

function Resumen({ cuenta }: { cuenta: EstadoDeCuenta }) {
  const s = useStyles(makeStyles);
  const ultimo = cuenta.recibos[0];
  return (
    <Card style={s.tarjeta} padding="lg">
      <SectionTitle>Cuenta</SectionTitle>
      <Saldo cuenta={cuenta} />
      {cuenta.porValidar > 0 ? <KeyValueRow label="Pagos por validar" value={textoDeSoles(cuenta.porValidar)} /> : null}
      {ultimo ? (
        <KeyValueRow
          label="Último recibo"
          value={`${textoCortoDePeriodo(ultimo.periodo)} · ${textoDeSoles(ultimo.total)} · vence ${textoDeFecha(ultimo.vence)}`}
        />
      ) : (
        <KeyValueRow label="Recibos" value="Todavía no se emitió ninguno" muted />
      )}
    </Card>
  );
}

/** El saldo lo calcula la base con los pagos aplicados; si es negativo, queda a favor de la unidad. */
function Saldo({ cuenta }: { cuenta: EstadoDeCuenta }) {
  if (cuenta.saldo < 0) return <KeyValueRow label="Saldo a favor" value={textoDeSoles(-cuenta.saldo)} strong />;
  return <KeyValueRow label="Saldo" value={textoDeSoles(cuenta.saldo)} strong danger={cuenta.estado.tono === "danger"} />;
}

function Tabla({ cobranza, orgId, cuenta, hoy }: { cobranza: CobranzaPuerto; orgId: string; cuenta: EstadoDeCuenta; hoy: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  const angosto = width > 0 && width < ANCHO_ANGOSTO;
  const [fallo, setFallo] = useState<string | null>(null);
  const cargos = cargosDeLaUnidad(cuenta.recibos, hoy);
  const porId = new Map(cuenta.recibos.map((r) => [r.id, r]));

  async function bajar(recibo: Recibo) {
    setFallo(null);
    if (!(await descargar(cobranza, orgId, recibo))) setFallo("No se pudo preparar el PDF. Inténtalo de nuevo.");
  }

  return (
    <View style={s.columna}>
      <Saldo cuenta={cuenta} />
      <DataTable minWidth={angosto ? 0 : 560}>
        {angosto ? null : (
          <TableHead>
            <Th flex={2}>Concepto</Th>
            <Th flex={2}>Periodo</Th>
            <Th flex={1} align="right">
              Monto
            </Th>
            <Th flex={1}>Estado</Th>
          </TableHead>
        )}
        {cargos.map((c) =>
          angosto ? (
            <TableRow key={`${c.reciboId}-${c.concepto}`}>
              <TdView flex={1}>
                <Text style={textStyle(t, "body")}>{`${c.concepto} · ${textoCortoDePeriodo(c.periodo)}`}</Text>
                <Text style={textStyle(t, "data")}>{textoDeSoles(c.monto)}</Text>
              </TdView>
              <Badge tone={TONO[c.estado]} label={TEXTO_DEL_ESTADO[c.estado]} />
            </TableRow>
          ) : (
            <TableRow key={`${c.reciboId}-${c.concepto}`}>
              <Td flex={2}>{c.concepto}</Td>
              <Td flex={2} muted>
                {textoCortoDePeriodo(c.periodo)}
              </Td>
              <Td flex={1} align="right" mono>
                {textoDeSoles(c.monto)}
              </Td>
              <TdView flex={1}>
                <Badge tone={TONO[c.estado]} label={TEXTO_DEL_ESTADO[c.estado]} />
              </TdView>
            </TableRow>
          ),
        )}
      </DataTable>
      <SectionTitle>Recibos</SectionTitle>
      {fallo ? <Aviso texto={fallo} /> : null}
      <View style={s.recibos}>
        {[...porId.values()].map((r) => (
          <Button
            key={r.id}
            variant="secondary"
            label={`${textoDeNumero(r.numero)} · ${textoCortoDePeriodo(r.periodo)} · PDF`}
            accessibilityLabel={`Descargar en PDF el recibo de ${textoCortoDePeriodo(r.periodo)}`}
            onPress={() => bajar(r)}
          />
        ))}
      </View>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    tarjeta: { width: "100%", maxWidth: 640, gap: t.space.md },
    columna: { gap: t.space.lg },
    recibos: { flexDirection: "row", flexWrap: "wrap", gap: t.space.sm },
  });
