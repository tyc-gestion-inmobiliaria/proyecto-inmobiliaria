/**
 * Lo que la cobranza pone en la ficha de la unidad (PB-19, PB-20): el estado
 * en palabras para el título, el saldo en el Resumen (grande, con el último
 * recibo y su PDF) y la pestaña Estado de cuenta, un recibo por tarjeta con
 * sus cargos, su total, su estado en texto y su PDF.
 *
 * Sin recibos emitidos, la pestaña no aparece: no hay pestañas vacías.
 */
import { useCallback, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useCarga } from "@/shared/ui/use-load";
import {
  Badge,
  Button,
  Card,
  KeyValueRow,
  textStyle,
  useStyles,
  useTheme,
  type StatusTone,
  type Tema,
} from "@/ui";

import { estadoDeCuenta, type EstadoDeCuenta } from "../application/use-cases";
import type { CobranzaPuerto } from "../application/ports";
import { textoDeSoles } from "../domain/money";
import { hoyEnLima, textoCortoDePeriodo, textoDeFecha, textoDePeriodo } from "../domain/period";
import { cargosDeLaUnidad, estadoDelCargo, TEXTO_DEL_ESTADO, textoDeNumero, type EstadoDelCargo, type Recibo } from "../domain/receipt";
import { descargar } from "./receipts";

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
        // Sin recibos, un saldo en cero no dice nada que la insignia "Sin recibos" no diga.
        resumen: cuenta.recibos.length > 0 ? <Resumen cobranza={cobranza} orgId={orgId} cuenta={cuenta} /> : undefined,
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

/** El saldo es lo que se busca al abrir la ficha: va primero y grande, con el último recibo y su PDF. */
function Resumen({ cobranza, orgId, cuenta }: { cobranza: CobranzaPuerto; orgId: string; cuenta: EstadoDeCuenta }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [fallo, setFallo] = useState<string | null>(null);
  const ultimo = cuenta.recibos[0];
  return (
    <Card style={s.tarjeta} padding="lg">
      <Text style={textStyle(t, "body", t.color.text.secondary)}>{cuenta.saldo < 0 ? "Saldo a favor" : "Saldo"}</Text>
      <Text style={textStyle(t, "display", cuenta.estado.tono === "danger" ? t.color.danger.fg : t.color.text.primary)} testID="ficha-saldo">
        {textoDeSoles(Math.abs(cuenta.saldo))}
      </Text>
      {cuenta.porValidar > 0 ? (
        <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{`${textoDeSoles(cuenta.porValidar)} en pagos por validar`}</Text>
      ) : null}
      {ultimo ? (
        <>
          <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>
            {`Recibo de ${textoDePeriodo(ultimo.periodo)} · vence el ${textoDeFecha(ultimo.vence)}`}
          </Text>
          {fallo ? <Aviso texto={fallo} /> : null}
          <Button
            variant="secondary"
            size="sm"
            icon="download"
            label="Descargar recibo"
            accessibilityLabel={`Descargar en PDF el recibo de ${textoDePeriodo(ultimo.periodo)}`}
            onPress={async () => {
              setFallo(null);
              if (!(await descargar(cobranza, orgId, ultimo))) setFallo("No se pudo preparar el PDF. Inténtalo de nuevo.");
            }}
            style={s.boton}
          />
        </>
      ) : null}
    </Card>
  );
}

/** El saldo lo calcula la base con los pagos aplicados; si es negativo, queda a favor de la unidad. */
function Tabla({ cobranza, orgId, cuenta, hoy }: { cobranza: CobranzaPuerto; orgId: string; cuenta: EstadoDeCuenta; hoy: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [fallo, setFallo] = useState<string | null>(null);
  const cargos = cargosDeLaUnidad(cuenta.recibos, hoy);
  const recibos = [...new Set(cargos.map((c) => c.reciboId))].map((id) => cuenta.recibos.find((r) => r.id === id) as Recibo);

  async function bajar(recibo: Recibo) {
    setFallo(null);
    if (!(await descargar(cobranza, orgId, recibo))) setFallo("No se pudo preparar el PDF. Inténtalo de nuevo.");
  }

  return (
    <View style={s.columna}>
      <View style={s.saldo}>
        <Text style={textStyle(t, "body", t.color.text.secondary)}>{cuenta.saldo < 0 ? "Saldo a favor" : "Saldo"}</Text>
        <Text style={textStyle(t, "title")}>{textoDeSoles(Math.abs(cuenta.saldo))}</Text>
      </View>
      {fallo ? <Aviso texto={fallo} /> : null}
      {recibos.map((r) => {
        const estado = estadoDelCargo(r, hoy);
        return (
          <Card key={r.id} padding="lg" style={s.recibo}>
            <View style={s.cabecera}>
              <View style={s.titulo}>
                <Text style={textStyle(t, "subtitle")}>{textoCortoDePeriodo(r.periodo)}</Text>
                <Text style={textStyle(t, "caption", t.color.text.secondary)}>
                  {`${textoDeNumero(r.numero)} · vence el ${textoDeFecha(r.vence)}`}
                </Text>
              </View>
              <View style={s.total}>
                <Text style={[textStyle(t, "data"), s.fuerte]}>{textoDeSoles(r.cuota + r.agua)}</Text>
                <Badge tone={TONO[estado]} label={TEXTO_DEL_ESTADO[estado]} />
              </View>
            </View>
            <View style={s.linea} />
            {cargos
              .filter((c) => c.reciboId === r.id)
              .map((c) => (
                <KeyValueRow key={c.concepto} label={c.concepto} value={textoDeSoles(c.monto)} />
              ))}
            <Button
              variant="ghost"
              size="sm"
              icon="download"
              label="Descargar PDF"
              accessibilityLabel={`Descargar en PDF el recibo de ${textoCortoDePeriodo(r.periodo)}`}
              onPress={() => bajar(r)}
              style={s.descargar}
            />
          </Card>
        );
      })}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    tarjeta: { width: "100%", gap: t.space.xs },
    boton: { alignSelf: "flex-start", marginTop: t.space.sm },
    columna: { gap: t.space.md, maxWidth: 720 },
    saldo: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: t.space.sm },
    recibo: { gap: t.space.sm },
    cabecera: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: t.space.md },
    titulo: { gap: t.space.xxs },
    total: { alignItems: "flex-end", gap: t.space.xs },
    fuerte: { fontWeight: "700" },
    linea: { height: 1, backgroundColor: t.color.border.subtle },
    descargar: { alignSelf: "flex-start", marginLeft: -t.space.md },
  });
