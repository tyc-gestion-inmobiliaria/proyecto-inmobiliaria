/**
 * Usuarios de la administradora (PB-23): quién tiene acceso y a quién se
 * invitó. Solo para el administrador: el menú no la muestra a los demás, y la
 * base tampoco les deja leer las invitaciones ni los correos.
 *
 * - Un solo primario, "Invitar", arriba.
 * - Las invitaciones que esperan algo (pendientes y vencidas) van primero y
 *   se pueden reenviar o cancelar ahí mismo; cancelar pregunta antes.
 * - El estado va en palabras ("Pendiente", "Vencida"…) además del color.
 * - Lo que acaba de pasar (enviada, reenviada, cancelada, o el error) se dice
 *   en una línea que el lector de pantalla anuncia.
 */
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useCarga } from "@/compartido/ui/usar-carga";
import {
  Badge,
  Button,
  ConfirmButton,
  DataTable,
  EmptyState,
  ScreenTitle,
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

import { cancelar, reenviar } from "../aplicacion/invitaciones";
import type { InvitacionesPuerto } from "../aplicacion/puertos";
import {
  estadoDeInvitacion,
  nombreDelEstado,
  ordenarInvitaciones,
  puedeInvitar,
  RUTA_DE_INVITACION,
  sigueAbierta,
  type EstadoInvitacion,
  type Invitacion,
} from "../dominio/invitacion";
import { nombreDelRol, ordenarMiembros, type Miembro } from "../dominio/membresia";
import { Cargando, ConOrganizacion } from "./con-organizacion";

const ANCHO_ANGOSTO = 640;

const TONO: Record<EstadoInvitacion, StatusTone> = {
  pendiente: "info",
  aceptada: "success",
  vencida: "warning",
  cancelada: "neutral",
};

const FECHA = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric" });

/** La dirección de la pantalla de aceptación en esta misma app; el enlace del correo le agrega el token. */
export function direccionDeAceptacion(): string {
  return Linking.createURL(RUTA_DE_INVITACION);
}

export function PantallaUsuarios({ invitaciones }: { invitaciones: InvitacionesPuerto }) {
  const s = useStyles(makeStyles);
  return (
    <ConOrganizacion>
      {(enCurso) =>
        puedeInvitar(enCurso.rol) ? (
          <Lista key={enCurso.orgId} orgId={enCurso.orgId} puerto={invitaciones} />
        ) : (
          <ScrollView contentContainerStyle={s.pantalla}>
            <EmptyState title="Tu rol no permite ver los usuarios" description="Pídeselo a un administrador de tu empresa." />
          </ScrollView>
        )
      }
    </ConOrganizacion>
  );
}

function Lista({ orgId, puerto }: { orgId: string; puerto: InvitacionesPuerto }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { enviada } = useLocalSearchParams<{ enviada?: string }>();
  const leer = useCallback(
    async () => {
      const [invitaciones, miembros] = await Promise.all([puerto.listar(orgId), puerto.miembros(orgId)]);
      return { invitaciones: ordenarInvitaciones(invitaciones), miembros: ordenarMiembros(miembros) };
    },
    [puerto, orgId],
  );
  const { carga, reintentar } = useCarga(leer);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(
    enviada ? { texto: `Se envió la invitación a ${enviada}.`, error: false } : null,
  );
  const [ocupada, setOcupada] = useState<string | null>(null);

  async function hacer(id: string, accion: () => Promise<{ ok: true } | { ok: false; mensaje: string }>, hecho: string) {
    setOcupada(id);
    setAviso(null);
    const r = await accion();
    setOcupada(null);
    setAviso(r.ok ? { texto: hecho, error: false } : { texto: r.mensaje, error: true });
    if (r.ok) reintentar();
  }

  const acciones = {
    ocupada,
    reenviar: (i: Invitacion) =>
      hacer(i.id, () => reenviar(puerto, { orgId, id: i.id, volverA: direccionDeAceptacion() }), `Se reenvió la invitación a ${i.correo}.`),
    cancelar: (i: Invitacion) => hacer(i.id, () => cancelar(puerto, { orgId, id: i.id }), `Se canceló la invitación a ${i.correo}.`),
  };

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <View style={s.cabecera}>
        <ScreenTitle>Usuarios</ScreenTitle>
        <Button label="Invitar" onPress={() => router.push("/usuarios/invitar")} testID="usuarios-invitar" />
      </View>

      {aviso ? (
        <Text
          accessibilityRole={aviso.error ? "alert" : undefined}
          accessibilityLiveRegion="polite"
          style={textStyle(t, "body", aviso.error ? t.color.danger.fg : t.color.success.fg)}
          testID="usuarios-aviso"
        >
          {aviso.error ? "⚠ " : "✓ "}
          {aviso.texto}
        </Text>
      ) : null}

      {carga.estado === "cargando" ? (
        <Cargando />
      ) : carga.estado === "error" ? (
        <EmptyState
          title="No se pudieron leer los usuarios"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      ) : (
        <>
          {carga.valor.invitaciones.length > 0 ? (
            <View style={s.bloque}>
              <SectionTitle>Invitaciones</SectionTitle>
              <TablaInvitaciones invitaciones={carga.valor.invitaciones} acciones={acciones} />
            </View>
          ) : null}
          <View style={s.bloque}>
            <SectionTitle>Con acceso</SectionTitle>
            <TablaMiembros miembros={carga.valor.miembros} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

interface Acciones {
  ocupada: string | null;
  reenviar: (i: Invitacion) => void;
  cancelar: (i: Invitacion) => void;
}

function TablaInvitaciones({ invitaciones, acciones }: { invitaciones: Invitacion[]; acciones: Acciones }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  const angosto = width < ANCHO_ANGOSTO;
  const ahora = new Date();

  return (
    <DataTable minWidth={angosto ? 0 : 720}>
      {angosto ? null : (
        <TableHead>
          <Th flex={3}>Correo</Th>
          <Th flex={1.4}>Rol</Th>
          <Th flex={1.4}>Estado</Th>
          <Th flex={1.6}>Vence</Th>
          <View style={s.columnaAcciones} />
        </TableHead>
      )}
      {invitaciones.map((i) => {
        const estado = estadoDeInvitacion(i, ahora);
        const abierta = sigueAbierta(estado);
        const ocupada = acciones.ocupada === i.id;
        const botones = abierta ? (
          <View style={[s.acciones, angosto ? null : s.columnaAcciones]}>
            <Button
              label="Reenviar"
              variant="secondary"
              size="sm"
              loading={ocupada}
              disabled={acciones.ocupada !== null && !ocupada}
              accessibilityLabel={`Reenviar la invitación a ${i.correo}`}
              onPress={() => acciones.reenviar(i)}
            />
            <ConfirmButton
              label="Cancelar"
              question="¿Cancelar la invitación?"
              confirmLabel="Sí, cancelar"
              variant="ghost"
              disabled={acciones.ocupada !== null}
              accessibilityLabel={`Cancelar la invitación a ${i.correo}`}
              onConfirm={() => acciones.cancelar(i)}
            />
          </View>
        ) : angosto ? null : (
          <View style={s.columnaAcciones} />
        );
        const vence = estado === "aceptada" || estado === "cancelada" ? "—" : FECHA.format(new Date(i.venceEn));

        if (angosto) {
          return (
            <TableRow key={i.id}>
              <TdView flex={1} style={s.apilada}>
                <Text style={textStyle(t, "body")} numberOfLines={1}>
                  {i.correo}
                </Text>
                <View style={s.lineaDatos}>
                  <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{nombreDelRol(i.rol)}</Text>
                  <Badge tone={TONO[estado]} label={nombreDelEstado(estado)} />
                  {vence !== "—" ? (
                    <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>Vence el {vence}</Text>
                  ) : null}
                </View>
                {botones}
              </TdView>
            </TableRow>
          );
        }
        return (
          <TableRow key={i.id}>
            <Td flex={3}>{i.correo}</Td>
            <Td flex={1.4}>{nombreDelRol(i.rol)}</Td>
            <TdView flex={1.4} style={s.celdaInsignia}>
              <Badge tone={TONO[estado]} label={nombreDelEstado(estado)} />
            </TdView>
            <Td flex={1.6} muted>
              {vence}
            </Td>
            {botones}
          </TableRow>
        );
      })}
    </DataTable>
  );
}

function TablaMiembros({ miembros }: { miembros: Miembro[] }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  const angosto = width < ANCHO_ANGOSTO;

  if (miembros.length === 0) {
    return <Text style={textStyle(t, "body", t.color.text.secondary)}>Todavía nadie aceptó una invitación.</Text>;
  }

  return (
    <DataTable minWidth={angosto ? 0 : 560}>
      {angosto ? null : (
        <TableHead>
          <Th flex={3}>Correo</Th>
          <Th flex={1.4}>Rol</Th>
          <Th flex={1.4}>Acceso</Th>
        </TableHead>
      )}
      {miembros.map((m) =>
        angosto ? (
          <TableRow key={m.usuarioId}>
            <TdView flex={1} style={s.apilada}>
              <Text style={textStyle(t, "body")} numberOfLines={1}>
                {m.correo}
              </Text>
              <View style={s.lineaDatos}>
                <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{nombreDelRol(m.rol)}</Text>
                <Badge tone={m.activa ? "success" : "neutral"} label={m.activa ? "Activo" : "Sin acceso"} />
              </View>
            </TdView>
          </TableRow>
        ) : (
          <TableRow key={m.usuarioId}>
            <Td flex={3}>{m.correo}</Td>
            <Td flex={1.4}>{nombreDelRol(m.rol)}</Td>
            <TdView flex={1.4} style={s.celdaInsignia}>
              <Badge tone={m.activa ? "success" : "neutral"} label={m.activa ? "Activo" : "Sin acceso"} />
            </TdView>
          </TableRow>
        ),
      )}
    </DataTable>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.xl, padding: t.space.xl, maxWidth: 1080, width: "100%" },
    cabecera: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: t.space.md },
    bloque: { gap: t.space.md },
    columnaAcciones: { width: 220 },
    acciones: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.sm },
    apilada: { gap: t.space.xs + 2 },
    lineaDatos: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.sm },
    celdaInsignia: { alignItems: "flex-start", justifyContent: "center" },
  });
