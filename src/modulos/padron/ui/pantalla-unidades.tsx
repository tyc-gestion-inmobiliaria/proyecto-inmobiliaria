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
import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { Cargando, ConOrganizacion } from "@/modulos/organizaciones/ui/con-organizacion";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  KeyValueRow,
  ScreenTitle,
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

import type { PuertosDelPadron } from "../aplicacion/puertos";
import { nombreDeMoneda, textoDeCci, type CuentaBancaria } from "../dominio/cuenta-bancaria";
import { avisoDeParticipacion, textoDePorcentaje, type ResumenParticipacion } from "../dominio/participacion";
import { ordenarUnidades, puedeEditarPadron, textoDeArea, type Unidad } from "../dominio/unidad";
import { Aviso, Volver } from "./piezas";
import { useCarga } from "./usar-carga";

const ANCHO_ANGOSTO = 640;

export const irALasUnidades = (edificioId: string) =>
  router.navigate({ pathname: "/edificios/[id]/unidades", params: { id: edificioId } });

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
  const volver = () => router.navigate("/edificios");

  if (carga.estado === "cargando") return <Cargando />;
  if (carga.estado === "error" || !carga.valor.edificio) {
    return (
      <ScrollView contentContainerStyle={s.pantalla}>
        <Volver label="Edificios" onPress={volver} />
        {carga.estado === "error" ? (
          <EmptyState
            title="No se pudieron leer las unidades"
            description="Revisa tu conexión y vuelve a intentarlo."
            action={<Button label="Reintentar" onPress={reintentar} />}
          />
        ) : (
          <EmptyState title="Este edificio no está en la cartera" />
        )}
      </ScrollView>
    );
  }

  const { edificio, unidades, participacion, cuentas } = carga.valor;
  const registrar = () => router.push({ pathname: "/edificios/[id]/unidades/nueva", params: { id: edificioId } });

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <Volver label="Edificios" onPress={volver} />
      <View style={s.cabecera}>
        <ScreenTitle>{edificio.nombre}</ScreenTitle>
        {editable ? (
          <View style={s.botones}>
            <Button
              variant="secondary"
              label="Editar edificio"
              onPress={() => router.push({ pathname: "/edificios/[id]", params: { id: edificioId } })}
            />
            {unidades.length > 0 ? <Button label="Registrar unidad" onPress={registrar} testID="unidades-registrar" /> : null}
          </View>
        ) : null}
      </View>

      {unidades.length === 0 ? (
        editable ? (
          <EmptyState
            title="Todavía no hay unidades en este edificio"
            action={<Button label="Registrar la primera unidad" onPress={registrar} testID="unidades-registrar" />}
          />
        ) : (
          <EmptyState
            title="Todavía no hay unidades en este edificio"
            description="Pide a un administrador de tu empresa que las registre."
          />
        )
      ) : (
        <>
          <Suma resumen={participacion} />
          <Tabla unidades={unidades} edificioId={edificioId} editable={editable} />
        </>
      )}
      <Cuentas cuentas={cuentas} edificioId={edificioId} editable={editable} />
    </ScrollView>
  );
}

function Suma({ resumen }: { resumen: ResumenParticipacion }) {
  const s = useStyles(makeStyles);
  const aviso = avisoDeParticipacion(resumen);
  return (
    <Card style={s.suma} padding="lg">
      <KeyValueRow label="Suma de participaciones" value={textoDePorcentaje(resumen.total)} strong />
      {aviso ? <Aviso testID="unidades-aviso-participacion">{aviso}</Aviso> : <StatusDot tone="success" label="Suma 100 %" />}
    </Card>
  );
}

function Tabla({ unidades, edificioId, editable }: { unidades: Unidad[]; edificioId: string; editable: boolean }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  const angosto = width < ANCHO_ANGOSTO;
  const abrir = (u: Unidad) => () =>
    router.push({ pathname: "/edificios/[id]/unidades/[unidadId]", params: { id: edificioId, unidadId: u.id } });
  const etiqueta = (u: Unidad) => `${editable ? "Editar" : "Ver"} la unidad ${u.numero}`;
  // La flecha dice que la fila se abre sin tener que pasar el puntero.
  const flecha = (
    <Text aria-hidden style={[textStyle(t, "label", t.color.accent.text), s.flecha]}>
      {editable ? "Editar ›" : "Ver ›"}
    </Text>
  );
  const participacion = (u: Unidad) => (u.participacion === null ? "Sin participación" : textoDePorcentaje(u.participacion));

  if (angosto) {
    return (
      <DataTable minWidth={0}>
        {unidades.map((u) => (
          <TableRow key={u.id} onPress={abrir(u)} accessibilityLabel={etiqueta(u)}>
            <TdView flex={1}>
              <Text style={[textStyle(t, "body"), s.numero]}>{u.numero}</Text>
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
  const registrar = () => router.push({ pathname: "/edificios/[id]/cuentas/nueva", params: { id: edificioId } });
  const editar = (c: CuentaBancaria) => () =>
    router.push({ pathname: "/edificios/[id]/cuentas/[cuentaId]", params: { id: edificioId, cuentaId: c.id } });
  return (
    <View style={s.cuentas}>
      <View style={s.cabecera}>
        <SectionTitle>Cuentas bancarias</SectionTitle>
        {editable && cuentas.length > 0 ? (
          <Button variant="secondary" label="Registrar cuenta" onPress={registrar} testID="cuentas-registrar" />
        ) : null}
      </View>
      {cuentas.length === 0 ? (
        <Card style={s.suma} padding="lg">
          <Aviso testID="cuentas-aviso">Sin una cuenta bancaria, el cierre del mes no puede emitir los recibos.</Aviso>
          {editable ? (
            <View style={s.botones}>
              <Button variant="secondary" label="Registrar la primera cuenta" onPress={registrar} testID="cuentas-registrar" />
            </View>
          ) : (
            <Text style={textStyle(t, "body", t.color.text.secondary)}>Pide a un administrador de tu empresa que la registre.</Text>
          )}
        </Card>
      ) : (
        <DataTable minWidth={0}>
          {cuentas.map((c) => {
            const contenido = (
              <TdView flex={1}>
                <Text style={[textStyle(t, "body"), s.numero]}>{c.nombre}</Text>
                <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>
                  {`${c.banco} · ${nombreDeMoneda(c.moneda)}`}
                </Text>
                <Text style={textStyle(t, "data")}>{`Cuenta ${c.numero}`}</Text>
                {c.cci ? <Text style={textStyle(t, "data", t.color.text.secondary)}>{`CCI ${textoDeCci(c.cci)}`}</Text> : null}
              </TdView>
            );
            return editable ? (
              <TableRow key={c.id} onPress={editar(c)} accessibilityLabel={`Editar la cuenta ${c.nombre}`}>
                {contenido}
                <Text aria-hidden style={[textStyle(t, "label", t.color.accent.text), s.flecha]}>
                  Editar ›
                </Text>
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
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: 960, width: "100%" },
    cabecera: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: t.space.md },
    botones: { flexDirection: "row", flexWrap: "wrap", gap: t.space.sm },
    suma: { gap: t.space.md },
    cuentas: { gap: t.space.md, marginTop: t.space.lg },
    numero: { fontWeight: "600" },
    flecha: { width: 64, textAlign: "right" },
  });
