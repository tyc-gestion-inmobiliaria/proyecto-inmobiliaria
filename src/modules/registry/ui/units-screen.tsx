/**
 * Las unidades de un edificio (PB-08).
 *
 * - Ordenadas por número en orden natural: 2 antes que 10.
 * - Arriba, la suma de participaciones como la calcula la base (vista
 *   `participacion_por_edificio`). Si no llega a 100 % o alguna unidad no
 *   tiene la suya, un aviso con texto dice la diferencia: el cierre lo va a
 *   pedir y es el administrador quien lo corrige.
 * - Registrar y editar solo se ofrecen al administrador; el personal abre la
 *   unidad para ver quién está en ella.
 * - En una ventana angosta la fila apila sus datos, para caber en 390.
 * - Abajo, las cuentas bancarias del edificio: sin ninguna, el cierre no
 *   puede emitir, y el aviso lo dice.
 */
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { Cargando, ConOrganizacion } from "@/modules/organizations/ui/with-organization";
import {
  ChoiceChips,
  TextField,
  Button,
  Card,
  DataTable,
  EmptyState,
  Icon,
  PageHeader,
  SectionTitle,
  StatusDot,
  TableHead,
  TableRow,
  Td,
  TdView,
  Th,
  textStyle,
  useStyles,
  useTheme,
  type Tema,
} from "@/ui";

import type { PuertosDelPadron } from "../application/ports";
import { nombreDeMoneda, textoDeCci, type CuentaBancaria } from "../domain/bank-account";
import { avisoDeParticipacion, textoDePorcentaje, type ResumenParticipacion } from "../domain/ownership-share";
import { ordenarUnidades, puedeEditarPadron, textoDeArea, type Unidad } from "../domain/unit";
import { Aviso, FlechaDeFila, Volver } from "@/shared/ui/pieces";
import { useCarga } from "@/shared/ui/use-load";

const ANCHO_ANGOSTO = 640;

export const irALasUnidades = (edificioId: string) =>
  router.navigate({ pathname: "/buildings/[id]/units", params: { id: edificioId } });

export function PantallaUnidades({ padron, edificioId }: { padron: PuertosDelPadron; edificioId: string }) {
  return (
    <ConOrganizacion>
      {(enCurso) => (
        <Lista
          key={`${enCurso.orgId}-${edificioId}`}
          orgId={enCurso.orgId}
          edificioId={edificioId}
          editable={puedeEditarPadron(enCurso.rol)}
          padron={padron}
        />
      )}
    </ConOrganizacion>
  );
}

function Lista({
  orgId,
  edificioId,
  editable,
  padron,
}: {
  orgId: string;
  edificioId: string;
  editable: boolean;
  padron: PuertosDelPadron;
}) {
  const s = useStyles(makeStyles);
  const leer = useCallback(async () => {
    const [edificios, unidades, participacion, cuentas] = await Promise.all([
      padron.edificios.listar(orgId),
      padron.unidades.delEdificio(orgId, edificioId),
      padron.unidades.participacion(orgId, edificioId),
      padron.cuentas.delEdificio(orgId, edificioId),
    ]);
    return { edificio: edificios.find((e) => e.id === edificioId), unidades: ordenarUnidades(unidades), participacion, cuentas };
  }, [padron, orgId, edificioId]);
  const { carga, reintentar } = useCarga(leer);
  const volver = () => router.navigate("/buildings");

  if (carga.estado === "cargando") return <Cargando />;
  if (carga.estado === "error" || !carga.valor.edificio) {
    return (
      <ScrollView contentContainerStyle={s.pantalla}>
        <Volver label="Edificios" onPress={volver} />
        {carga.estado === "error" ? (
          <EmptyState
            icon="refresh-cw"
            title="No se pudieron leer las unidades"
            description="Revisa tu conexión y vuelve a intentarlo."
            action={<Button label="Reintentar" onPress={reintentar} />}
          />
        ) : (
          <EmptyState icon="building" title="Este edificio no está en la cartera" />
        )}
      </ScrollView>
    );
  }

  const { edificio, unidades, participacion, cuentas } = carga.valor;
  const registrar = () => router.push({ pathname: "/buildings/[id]/units/new", params: { id: edificioId } });

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <PageHeader
        title={edificio.nombre}
        back={{ label: "Edificios", onPress: volver }}
        actions={
          editable ? (
            <>
              <Button
                variant="secondary"
                icon="pencil"
                label="Editar edificio"
                onPress={() => router.push({ pathname: "/buildings/[id]", params: { id: edificioId } })}
              />
              {unidades.length > 0 ? (
                <Button variant="secondary" icon="plus" label="Registrar unidad" onPress={registrar} testID="unidades-registrar" />
              ) : null}
              {unidades.length > 0 ? (
                <Button
                  icon="calendar-check"
                  label="Cierre del mes"
                  onPress={() => router.push({ pathname: "/buildings/[id]/closing", params: { id: edificioId } })}
                  testID="unidades-cierre"
                />
              ) : null}
            </>
          ) : null
        }
      />

      {unidades.length === 0 ? (
        editable ? (
          <EmptyState
            icon="door"
            title="Todavía no hay unidades en este edificio"
            action={<Button icon="plus" label="Registrar la primera unidad" onPress={registrar} testID="unidades-registrar" />}
          />
        ) : (
          <EmptyState
            icon="door"
            title="Todavía no hay unidades en este edificio"
            description="Pide a un administrador de tu empresa que las registre."
          />
        )
      ) : (
        <>
          <Suma resumen={participacion} />
          <ConFiltro unidades={unidades} edificioId={edificioId} editable={editable} />
        </>
      )}
      <Cuentas cuentas={cuentas} edificioId={edificioId} editable={editable} />
    </ScrollView>
  );
}

function Suma({ resumen }: { resumen: ResumenParticipacion }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const aviso = avisoDeParticipacion(resumen);
  return (
    <Card style={s.suma} padding="lg">
      <View style={s.sumaFila}>
        <View style={s.icono}>
          <Icon name="percent" color={t.color.accent.text} />
        </View>
        <View style={s.sumaTexto}>
          <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>Suma de participaciones</Text>
          <Text style={[textStyle(t, "title"), s.cifra]}>{textoDePorcentaje(resumen.total)}</Text>
        </View>
        {aviso ? null : <StatusDot tone="success" label="Suma 100 %" />}
      </View>
      {aviso ? <Aviso testID="unidades-aviso-participacion">{aviso}</Aviso> : null}
    </Card>
  );
}

/** Desde cuántas unidades conviene buscar y filtrar en vez de recorrer. */
const CON_FILTRO = 8;

/**
 * En un edificio grande (59 unidades en el portal actual) se busca por número
 * o tipo, y se dejan solas las que no tienen participación, que es lo que hay
 * que completar antes del cierre.
 */
function ConFiltro({ unidades, edificioId, editable }: { unidades: Unidad[]; edificioId: string; editable: boolean }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<"todas" | "sin">("todas");
  if (unidades.length <= CON_FILTRO) return <Tabla unidades={unidades} edificioId={edificioId} editable={editable} />;
  const sinParticipacion = unidades.filter((u) => u.participacion === null).length;
  const termino = busqueda.trim().toLowerCase();
  const visibles = unidades.filter(
    (u) => (filtro === "todas" || u.participacion === null) && (!termino || `${u.numero} ${u.tipo ?? ""}`.toLowerCase().includes(termino)),
  );
  return (
    <>
      <View style={s.filtros}>
        <View style={s.buscar}>
          <TextField
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por número o tipo…"
            accessibilityLabel="Buscar unidad"
            onClear={busqueda ? () => setBusqueda("") : undefined}
          />
        </View>
        {sinParticipacion > 0 ? (
          <ChoiceChips
            accessibilityLabel="Qué unidades mostrar"
            value={filtro}
            onChange={(v) => v && setFiltro(v)}
            options={[
              { id: "todas", label: `Todas (${unidades.length})` },
              { id: "sin", label: `Sin participación (${sinParticipacion})` },
            ]}
          />
        ) : null}
      </View>
      {visibles.length === 0 ? (
        <Text style={textStyle(t, "body", t.color.text.secondary)}>Ninguna unidad coincide con la búsqueda.</Text>
      ) : (
        <Tabla unidades={visibles} edificioId={edificioId} editable={editable} />
      )}
    </>
  );
}

function Tabla({ unidades, edificioId, editable }: { unidades: Unidad[]; edificioId: string; editable: boolean }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  const angosto = width < ANCHO_ANGOSTO;
  const abrir = (u: Unidad) => () =>
    router.push({ pathname: "/buildings/[id]/units/[unitId]", params: { id: edificioId, unitId: u.id } });
  const etiqueta = (u: Unidad) => `${editable ? "Editar" : "Ver"} la unidad ${u.numero}`;
  // La flecha dice que la fila se abre sin tener que pasar el puntero.
  const flecha = (
    <View style={s.flecha}>
      <FlechaDeFila />
    </View>
  );
  const participacion = (u: Unidad) => (u.participacion === null ? "Sin participación" : textoDePorcentaje(u.participacion));

  if (angosto) {
    return (
      <DataTable minWidth={0}>
        {unidades.map((u) => (
          <TableRow key={u.id} onPress={abrir(u)} accessibilityLabel={etiqueta(u)}>
            <TdView flex={1}>
              <Text style={textStyle(t, "subtitle")}>{u.numero}</Text>
              <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>
                {[u.tipo, u.areaM2 === null ? null : textoDeArea(u.areaM2)].filter(Boolean).join(" · ") || "—"}
              </Text>
              <Text style={textStyle(t, "bodySmall", u.participacion === null ? t.color.warning.fg : t.color.text.primary)}>
                {participacion(u)}
              </Text>
            </TdView>
            {flecha}
          </TableRow>
        ))}
      </DataTable>
    );
  }

  return (
    <DataTable minWidth={560}>
      <TableHead>
        <Th flex={1}>Número</Th>
        <Th flex={2}>Tipo</Th>
        <Th flex={1} align="right">
          Área
        </Th>
        <Th flex={1} align="right">
          Participación
        </Th>
        <View style={s.flecha} />
      </TableHead>
      {unidades.map((u) => (
        <TableRow key={u.id} onPress={abrir(u)} accessibilityLabel={etiqueta(u)}>
          <Td flex={1} style={s.numero}>
            {u.numero}
          </Td>
          <Td flex={2} muted>
            {u.tipo ?? "—"}
          </Td>
          <Td flex={1} align="right" mono>
            {textoDeArea(u.areaM2)}
          </Td>
          <Td flex={1} align="right" mono muted={u.participacion === null}>
            {participacion(u)}
          </Td>
          {flecha}
        </TableRow>
      ))}
    </DataTable>
  );
}

function Cuentas({ cuentas, edificioId, editable }: { cuentas: CuentaBancaria[]; edificioId: string; editable: boolean }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const registrar = () => router.push({ pathname: "/buildings/[id]/accounts/new", params: { id: edificioId } });
  const editar = (c: CuentaBancaria) => () =>
    router.push({ pathname: "/buildings/[id]/accounts/[accountId]", params: { id: edificioId, accountId: c.id } });
  return (
    <View style={s.cuentas}>
      <View style={s.cabecera}>
        <SectionTitle>Cuentas bancarias</SectionTitle>
        {editable && cuentas.length > 0 ? (
          <Button variant="secondary" icon="plus" label="Registrar cuenta" onPress={registrar} testID="cuentas-registrar" />
        ) : null}
      </View>
      {cuentas.length === 0 ? (
        <Card style={s.suma} padding="lg">
          <Aviso testID="cuentas-aviso">Sin una cuenta bancaria, el cierre del mes no puede emitir los recibos.</Aviso>
          {editable ? (
            <View style={s.botones}>
              <Button variant="secondary" icon="plus" label="Registrar la primera cuenta" onPress={registrar} testID="cuentas-registrar" />
            </View>
          ) : (
            <Text style={textStyle(t, "body", t.color.text.secondary)}>Pide a un administrador de tu empresa que la registre.</Text>
          )}
        </Card>
      ) : (
        <DataTable minWidth={0}>
          {cuentas.map((c) => {
            const contenido = (
              <>
              <View style={s.icono}>
                <Icon name="landmark" color={t.color.accent.text} />
              </View>
              <TdView flex={1} style={s.cuenta}>
                <Text style={[textStyle(t, "body"), s.numero]}>{c.nombre}</Text>
                <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>
                  {`${c.banco} · ${nombreDeMoneda(c.moneda)}`}
                </Text>
                <Text style={textStyle(t, "data")}>{`Cuenta ${c.numero}`}</Text>
                {c.cci ? <Text style={textStyle(t, "data", t.color.text.secondary)}>{`CCI ${textoDeCci(c.cci)}`}</Text> : null}
              </TdView>
              </>
            );
            return editable ? (
              <TableRow key={c.id} onPress={editar(c)} accessibilityLabel={`Editar la cuenta ${c.nombre}`}>
                {contenido}
                <View style={s.flecha}>
                  <FlechaDeFila />
                </View>
              </TableRow>
            ) : (
              <TableRow key={c.id}>{contenido}</TableRow>
            );
          })}
        </DataTable>
      )}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    filtros: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.md },
    buscar: { flexGrow: 1, flexBasis: 240, maxWidth: 380 },
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: 960, width: "100%" },
    cabecera: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: t.space.md },
    botones: { flexDirection: "row", flexWrap: "wrap", gap: t.space.sm },
    suma: { gap: t.space.md },
    sumaFila: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.md },
    sumaTexto: { flexGrow: 1, flexShrink: 1 },
    cifra: { fontVariant: ["tabular-nums"] },
    icono: {
      width: 40,
      height: 40,
      borderRadius: t.radius.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.color.accent.subtle,
    },
    cuentas: { gap: t.space.md, marginTop: t.space.lg },
    cuenta: { gap: t.space.xxs },
    numero: { fontWeight: "600" },
    flecha: { width: 32 },
  });
