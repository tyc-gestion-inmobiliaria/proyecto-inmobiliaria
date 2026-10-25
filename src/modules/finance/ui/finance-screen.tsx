/**
 * Las finanzas de un edificio en el mes en curso.
 *
 * - Arriba, tres cifras: lo que entró, lo que salió y el resultado, con su
 *   signo escrito (no solo el color).
 * - Debajo, cada fondo con su saldo y cómo llegó a él desde el inicio del
 *   mes.
 * - Los movimientos del mes, el último primero; se filtran por ingresos o
 *   egresos. En una ventana ancha van en tabla; en el teléfono, apilados.
 * - "Registrar egreso" es el único botón primario. Los totales los trae el
 *   adaptador calculados (con base, el servidor): la pantalla no suma nada.
 */
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { LineaDeAviso, type AvisoDeAccion } from "@/shared/ui/action-notice";
import { CampoDeOpciones } from "@/shared/ui/pieces";
import { useCarga } from "@/shared/ui/use-load";
import { hoyEnLima, nombreDelMes, textoDeFecha, textoDeSoles } from "@/shared/format";
import { Cargando } from "@/modules/organizations/ui/with-organization";
import { ANCHO_DE_PANTALLA } from "@/shared/ui/layout";
import {
  Button,
  Card,
  ChoiceChips,
  DataTable,
  Dialog,
  EmptyState,
  PageHeader,
  SectionTitle,
  StatTile,
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

import type { FinanzasPuerto } from "../application/ports";
import { validarEgreso, type DatosDelEgreso, type ErroresDelEgreso, type FondoDelMes, type Movimiento, type ResumenDelMes, type TipoDeMovimiento } from "../domain/finance";

const ANCHO_ANGOSTO = 720;

function conSigno(m: Movimiento): string {
  return `${m.tipo === "ingreso" ? "+" : "−"} ${textoDeSoles(m.monto)}`;
}

function resultado(n: number): string {
  return n < 0 ? `− ${textoDeSoles(-n)}` : textoDeSoles(n);
}

export function PantallaFinanzas({ finanzas, edificioId }: { finanzas: FinanzasPuerto; edificioId: string }) {
  const s = useStyles(makeStyles);
  const [aviso, setAviso] = useState<AvisoDeAccion | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const leer = useCallback(() => finanzas.resumen(edificioId), [finanzas, edificioId]);
  const { carga, reintentar } = useCarga(leer);

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <PageHeader
        title="Finanzas"
        actions={<Button icon="plus" label="Registrar egreso" onPress={() => setRegistrando(true)} disabled={carga.estado !== "listo"} testID="finanzas-egreso" />}
      />
      <LineaDeAviso aviso={aviso} />
      {carga.estado === "cargando" ? <Cargando /> : null}
      {carga.estado === "error" ? (
        <EmptyState
          title="No se pudieron leer las finanzas"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      ) : null}
      {carga.estado === "listo" ? <DelMes resumen={carga.valor} /> : null}
      {registrando && carga.estado === "listo" ? (
        <NuevoEgreso
          finanzas={finanzas}
          edificioId={edificioId}
          fondos={carga.valor.fondos}
          onCerrar={() => setRegistrando(false)}
          onHecho={(m) => {
            setRegistrando(false);
            setAviso({ tono: "ok", texto: `Egreso registrado: ${m.concepto}, ${textoDeSoles(m.monto)}.` });
            reintentar();
          }}
        />
      ) : null}
    </ScrollView>
  );
}

function DelMes({ resumen: r }: { resumen: ResumenDelMes }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [tipo, setTipo] = useState<TipoDeMovimiento | undefined>(undefined);
  const angosto = useWindowDimensions().width < ANCHO_ANGOSTO;
  const mes = nombreDelMes(r.periodo);
  const lista = r.movimientos.filter((m) => !tipo || m.tipo === tipo);
  const nombreDelFondo = (id: string) => r.fondos.find((f) => f.fondo.id === id)?.fondo.nombre ?? "—";

  return (
    <>
      <View style={s.cifras}>
        <View style={s.cifra}>
          <StatTile icon="download" label={`Ingresos de ${mes}`} value={textoDeSoles(r.ingresos)} />
        </View>
        <View style={s.cifra}>
          <StatTile icon="send" label={`Egresos de ${mes}`} value={textoDeSoles(r.egresos)} />
        </View>
        <View style={s.cifra}>
          <StatTile icon="wallet" label={r.resultado < 0 ? "Salió más de lo que entró" : "Resultado del mes"} value={resultado(r.resultado)} emphasis />
        </View>
      </View>

      <View style={s.seccion}>
        <SectionTitle>Fondos</SectionTitle>
        <View style={s.fondos}>
          {r.fondos.map((f) => (
            <TarjetaDeFondo key={f.fondo.id} fondo={f} />
          ))}
        </View>
      </View>

      <View style={s.seccion}>
        <View style={s.cabezaMovimientos}>
          <SectionTitle>Movimientos</SectionTitle>
          <ChoiceChips
            accessibilityLabel="Filtrar movimientos"
            clearable
            allLabel="Todos"
            options={[
              { id: "ingreso", label: "Ingresos" },
              { id: "egreso", label: "Egresos" },
            ]}
            value={tipo}
            onChange={setTipo}
          />
        </View>
        {lista.length === 0 ? (
          <EmptyState icon="wallet" title={tipo === "egreso" ? `No hay egresos en ${mes}` : tipo === "ingreso" ? `No hay ingresos en ${mes}` : `No hay movimientos en ${mes}`} />
        ) : angosto ? (
          <Card padding="md" style={s.apilados}>
            {lista.map((m, i) => (
              <View key={m.id} style={[s.movimiento, i === 0 && s.primera]}>
                <View style={s.textoMov}>
                  <Text style={textStyle(t, "body")}>{m.concepto}</Text>
                  <Text style={textStyle(t, "caption", t.color.text.secondary)}>
                    {[textoDeFecha(m.fecha), nombreDelFondo(m.fondoId), m.proveedor].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                <Text style={[textStyle(t, "data", m.tipo === "ingreso" ? t.color.success.fg : t.color.text.primary), s.monto]}>{conSigno(m)}</Text>
              </View>
            ))}
          </Card>
        ) : (
          <DataTable minWidth={0}>
            <TableHead>
              <Th flex={1}>Fecha</Th>
              <Th flex={3}>Concepto</Th>
              <Th flex={2}>Fondo</Th>
              <Th flex={2} align="right">
                Monto
              </Th>
            </TableHead>
            {lista.map((m) => (
              <TableRow key={m.id} accessibilityLabel={`${m.tipo === "ingreso" ? "Ingreso" : "Egreso"}: ${m.concepto}, ${textoDeSoles(m.monto)}`}>
                <Td flex={1} mono>
                  {textoDeFecha(m.fecha)}
                </Td>
                <TdView flex={3} style={s.celdaTexto}>
                  <Text style={textStyle(t, "body")}>{m.concepto}</Text>
                  {m.proveedor ? <Text style={textStyle(t, "caption", t.color.text.secondary)}>{m.proveedor}</Text> : null}
                </TdView>
                <Td flex={2} muted>
                  {nombreDelFondo(m.fondoId)}
                </Td>
                <Td flex={2} mono align="right" style={m.tipo === "ingreso" ? { color: t.color.success.fg } : undefined}>
                  {conSigno(m)}
                </Td>
              </TableRow>
            ))}
          </DataTable>
        )}
      </View>
    </>
  );
}

function TarjetaDeFondo({ fondo: f }: { fondo: FondoDelMes }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <Card padding="lg" style={s.fondo}>
      <Text style={textStyle(t, "label", t.color.text.secondary)}>{f.fondo.nombre}</Text>
      <Text style={textStyle(t, "title", f.saldo < 0 ? t.color.danger.fg : undefined)}>{f.saldo < 0 ? `− ${textoDeSoles(-f.saldo)}` : textoDeSoles(f.saldo)}</Text>
      <Text style={textStyle(t, "caption", t.color.text.secondary)}>
        {`Inicio ${textoDeSoles(f.fondo.saldoInicial)} · + ${textoDeSoles(f.ingresos)} · − ${textoDeSoles(f.egresos)}`}
      </Text>
    </Card>
  );
}

function NuevoEgreso({
  finanzas,
  edificioId,
  fondos,
  onCerrar,
  onHecho,
}: {
  finanzas: FinanzasPuerto;
  edificioId: string;
  fondos: FondoDelMes[];
  onCerrar: () => void;
  onHecho: (m: Movimiento) => void;
}) {
  const hoy = hoyEnLima();
  const [datos, setDatos] = useState<DatosDelEgreso>({
    concepto: "",
    monto: "",
    fondoId: fondos.length === 1 ? fondos[0].fondo.id : undefined,
    fecha: textoDeFecha(hoy),
    proveedor: "",
  });
  const [errores, setErrores] = useState<ErroresDelEgreso>({});
  const [general, setGeneral] = useState<AvisoDeAccion | null>(null);
  const [enviando, setEnviando] = useState(false);
  const elegido = fondos.find((f) => f.fondo.id === datos.fondoId);

  function cambiar<K extends keyof DatosDelEgreso>(campo: K, valor: DatosDelEgreso[K]) {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  async function registrar() {
    if (enviando) return;
    const v = validarEgreso(datos, { hoy, fondos });
    if (!v.ok) return setErrores(v.errores);
    setErrores({});
    setEnviando(true);
    const r = await finanzas.registrarEgreso(edificioId, v.egreso);
    setEnviando(false);
    if (r.ok) onHecho(r.valor);
    else setGeneral({ tono: "error", texto: r.mensaje });
  }

  return (
    <Dialog
      visible
      title="Registrar egreso"
      onClose={onCerrar}
      footer={
        <>
          <Button variant="secondary" label="Cancelar" onPress={onCerrar} disabled={enviando} />
          <Button label="Registrar egreso" onPress={registrar} loading={enviando} testID="finanzas-guardar" />
        </>
      }
    >
      <TextField
        label="Concepto"
        required
        autoFocus
        value={datos.concepto}
        onChangeText={(v) => cambiar("concepto", v)}
        placeholder="Ej.: cambio de focos del pasadizo"
        error={errores.concepto}
      />
      <TextField label="Monto" required mono keyboardType="decimal-pad" value={datos.monto} onChangeText={(v) => cambiar("monto", v)} placeholder="0.00" error={errores.monto} />
      <CampoDeOpciones
        label="Sale del fondo"
        required
        options={fondos.map((f) => ({ id: f.fondo.id, label: f.fondo.nombre }))}
        value={datos.fondoId}
        onChange={(v) => cambiar("fondoId", v)}
        error={errores.fondoId}
        helper={elegido ? `Saldo: ${textoDeSoles(elegido.saldo)}` : undefined}
      />
      <TextField label="Fecha" required value={datos.fecha} onChangeText={(v) => cambiar("fecha", v)} placeholder="dd/mm/aaaa" error={errores.fecha} />
      <TextField label="Proveedor" value={datos.proveedor} onChangeText={(v) => cambiar("proveedor", v)} />
      <LineaDeAviso aviso={general} />
    </Dialog>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.xl, padding: t.space.xl, maxWidth: ANCHO_DE_PANTALLA, width: "100%" },
    cifras: { flexDirection: "row", flexWrap: "wrap", gap: t.space.md },
    cifra: { flexGrow: 1, flexShrink: 1, flexBasis: 220 },
    seccion: { gap: t.space.md },
    fondos: { flexDirection: "row", flexWrap: "wrap", gap: t.space.md },
    fondo: { flexGrow: 1, flexShrink: 1, flexBasis: 260, gap: t.space.xs },
    cabezaMovimientos: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: t.space.sm },
    apilados: { paddingVertical: t.space.xs },
    movimiento: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: t.space.md,
      paddingVertical: t.space.sm,
      borderTopWidth: 1,
      borderTopColor: t.color.border.subtle,
    },
    primera: { borderTopWidth: 0 },
    textoMov: { flex: 1, minWidth: 0, gap: t.space.xxs },
    monto: { textAlign: "right" },
    celdaTexto: { minWidth: 0, gap: t.space.xxs },
  });
