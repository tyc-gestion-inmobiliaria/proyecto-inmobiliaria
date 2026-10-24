/**
 * Lo que los pagos ponen en la ficha de la unidad (PB-28): la acción
 * primaria "Registrar pago" para el administrador y la pestaña Pagos con
 * cada pago, su monto, su fecha y su estado en palabras.
 *
 * La ficha es del padrón y no sabe de pagos: la ruta compone esta pieza con
 * la de la cobranza. Registrado un pago, `onCambio` avisa a la ruta para que
 * la cuenta vuelva a leer el saldo, que calcula la base.
 *
 * Sin pagos, la pestaña no aparece: no hay pestañas vacías.
 */
import { useCallback, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useCarga } from "@/compartido/ui/usar-carga";
import { Badge, Button, DataTable, TableRow, TdView, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import { pagosDeLaUnidad } from "../aplicacion/casos-de-uso";
import type { CuentaDestino, PagosPuerto } from "../aplicacion/puertos";
import { textoDeCentimos } from "../dominio/dinero";
import { textoDeFecha } from "../dominio/formulario";
import { TEXTO_DEL_ESTADO, TONO_DEL_ESTADO, type Pago } from "../dominio/pago";
import { VerComprobante } from "./comprobante";
import { FormularioDePago } from "./formulario-de-pago";

export interface PagosParaLaFicha {
  /** La acción primaria de la cabecera, o nada si el rol no registra pagos. */
  accion?: ReactNode;
  pestanas: { key: string; label: string; contenido: ReactNode }[];
}

interface Props {
  pagos: PagosPuerto;
  orgId: string;
  edificioId: string;
  unidadId: string;
  unidadNumero?: string;
  /** Si quien mira puede registrar pagos (el administrador). */
  gestiona: boolean;
  onCambio: () => void;
  children: (parte: PagosParaLaFicha) => ReactNode;
}

export function PagosDeLaUnidad({ pagos, orgId, edificioId, unidadId, unidadNumero, gestiona, onCambio, children }: Props) {
  const t = useTheme();
  const leer = useCallback(async () => {
    const [lista, cuentas] = await Promise.all([pagosDeLaUnidad(pagos, orgId, unidadId), pagos.cuentasDelEdificio(orgId, edificioId)]);
    return { lista, cuentas };
  }, [pagos, orgId, unidadId, edificioId]);
  const { carga, reintentar } = useCarga(leer);
  const [abierto, setAbierto] = useState(false);
  const [hecho, setHecho] = useState(false);

  const cuentas: readonly CuentaDestino[] = carga.estado === "listo" ? carga.valor.cuentas : [];
  const lista: readonly Pago[] = carga.estado === "listo" ? carga.valor.lista : [];

  function registrado() {
    setAbierto(false);
    setHecho(true);
    reintentar();
    onCambio();
  }

  const accion = gestiona ? (
    <View>
      <Button
        label="Registrar pago"
        onPress={() => {
          setHecho(false);
          setAbierto(true);
        }}
        disabled={carga.estado !== "listo"}
        testID="unidad-registrar-pago"
      />
      {hecho ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={textStyle(t, "caption", t.color.success.fg)}>
          ✓ Pago registrado
        </Text>
      ) : null}
      {carga.estado === "error" ? (
        <Text accessibilityRole="alert" style={textStyle(t, "caption", t.color.danger.fg)}>
          ! No se pudieron leer los pagos. Vuelve a abrir la unidad.
        </Text>
      ) : null}
      {abierto ? (
        <FormularioDePago
          pagos={pagos}
          orgId={orgId}
          unidadId={unidadId}
          unidadNumero={unidadNumero}
          cuentas={cuentas}
          onCerrar={() => setAbierto(false)}
          onRegistrado={registrado}
        />
      ) : null}
    </View>
  ) : undefined;

  return (
    <>
      {children({
        accion,
        pestanas: lista.length > 0 ? [{ key: "pagos", label: "Pagos", contenido: <Lista pagos={pagos} lista={lista} /> }] : [],
      })}
    </>
  );
}

function Lista({ pagos, lista }: { pagos: PagosPuerto; lista: readonly Pago[] }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <DataTable minWidth={0}>
      {lista.map((p) => (
        <TableRow key={p.id}>
          <TdView flex={1} style={s.celda}>
            <View style={s.cabeza}>
              <Text style={textStyle(t, "data")}>{textoDeCentimos(p.monto)}</Text>
              <Badge tone={TONO_DEL_ESTADO[p.estado]} label={TEXTO_DEL_ESTADO[p.estado]} />
            </View>
            <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>
              {[
                textoDeFecha(p.fecha),
                p.operacion ? `Operación ${p.operacion}` : null,
                p.cuenta ? `${p.cuenta.banco} ${p.cuenta.numero}` : p.origen === "registrado" ? "Sin cuenta" : null,
              ]
                .filter((x): x is string => x !== null)
                .join(" · ")}
            </Text>
            {p.motivoRechazo ? <Text style={textStyle(t, "bodySmall")}>{`Motivo: ${p.motivoRechazo}`}</Text> : null}
          </TdView>
          {p.comprobante ? <VerComprobante pagos={pagos} ruta={p.comprobante} unidadNumero={p.unidadNumero} /> : null}
        </TableRow>
      ))}
    </DataTable>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    celda: { gap: t.space.xs },
    cabeza: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.sm },
  });
