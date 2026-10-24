/**
 * Los edificios de la administradora en curso (PB-07): una tarjeta por
 * edificio con lo que se necesita para trabajarlo.
 *
 * - Cada tarjeta: la foto de portada (genérica por ahora), el nombre, la
 *   dirección, cuántas unidades tiene, cómo está su participación y dónde se
 *   paga, y lo que le falta al padrón para poder cobrar, en palabras.
 * - Las acciones van en la tarjeta, sin buscar en otro lado: ver las
 *   unidades, el cierre del mes, y para el administrador, registrar la
 *   cuenta que falta o editar el edificio. Todas secundarias: el único
 *   primario de la vista es "Registrar edificio".
 * - Con más de seis edificios aparece la búsqueda por nombre o dirección.
 * - Lo que se ve sale del padrón por sus puertos; nada se calcula acá.
 * - Registrar y editar solo se ofrecen a quien la base deja escribir (el
 *   administrador). Un solo primario: arriba si ya hay edificios; si no, en
 *   el vacío.
 */
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { fotoDeEdificio } from "@/compartido/ui/foto-de-edificio";
import { useCarga } from "@/compartido/ui/usar-carga";
import { Cargando, ConOrganizacion } from "@/modulos/organizaciones/ui/con-organizacion";
import { Badge, Button, Card, EmptyState, Icon, PageHeader, StatusDot, TextField, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import type { PuertosDelPadron } from "../aplicacion/puertos";
import type { CuentaBancaria } from "../dominio/cuenta-bancaria";
import { puedeEditarEdificios, type Edificio } from "../dominio/edificio";
import { estadoDelPadron } from "../dominio/estado-del-edificio";
import { textoDePorcentaje, type ResumenParticipacion } from "../dominio/participacion";

/** Desde cuántos edificios conviene buscar en vez de recorrer. */
const CON_BUSQUEDA = 6;

interface FichaDeEdificio {
  edificio: Edificio;
  participacion: ResumenParticipacion;
  cuentas: CuentaBancaria[];
}

export function PantallaEdificios({ padron }: { padron: PuertosDelPadron }) {
  return (
    <ConOrganizacion>
      {(enCurso) => (
        // La clave descarta la lista anterior al cambiar de administradora.
        <ListaEdificios key={enCurso.orgId} orgId={enCurso.orgId} editable={puedeEditarEdificios(enCurso.rol)} padron={padron} />
      )}
    </ConOrganizacion>
  );
}

function ListaEdificios({ orgId, editable, padron }: { orgId: string; editable: boolean; padron: PuertosDelPadron }) {
  const s = useStyles(makeStyles);
  const leer = useCallback(async (): Promise<FichaDeEdificio[]> => {
    const edificios = await padron.edificios.listar(orgId);
    return Promise.all(
      edificios.map(async (edificio) => {
        const [participacion, cuentas] = await Promise.all([
          padron.unidades.participacion(orgId, edificio.id),
          padron.cuentas.delEdificio(orgId, edificio.id),
        ]);
        return { edificio, participacion, cuentas };
      }),
    );
  }, [padron, orgId]);
  const { carga, reintentar } = useCarga(leer);
  const [busqueda, setBusqueda] = useState("");
  const fichas = carga.estado === "listo" ? carga.valor : [];
  const termino = busqueda.trim().toLowerCase();
  const visibles = termino
    ? fichas.filter((f) => `${f.edificio.nombre} ${f.edificio.direccion ?? ""}`.toLowerCase().includes(termino))
    : fichas;

  return (
    <ScrollView contentContainerStyle={s.pantalla} keyboardShouldPersistTaps="handled">
      <PageHeader
        title="Edificios"
        actions={
          editable && fichas.length > 0 ? (
            <Button icon="plus" label="Registrar edificio" onPress={() => router.push("/edificios/nuevo")} testID="edificios-registrar" />
          ) : null
        }
      />

      {carga.estado === "cargando" ? (
        <Cargando />
      ) : carga.estado === "error" ? (
        <EmptyState
          icon="refresh-cw"
          title="No se pudieron leer los edificios"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      ) : fichas.length === 0 ? (
        editable ? (
          <EmptyState
            icon="building"
            title="Todavía no hay edificios registrados"
            action={
              <Button icon="plus" label="Registrar el primer edificio" onPress={() => router.push("/edificios/nuevo")} testID="edificios-registrar" />
            }
          />
        ) : (
          <EmptyState
            icon="building"
            title="Todavía no hay edificios registrados"
            description="Pide a un administrador de tu empresa que los registre."
          />
        )
      ) : (
        <>
          {fichas.length > CON_BUSQUEDA ? (
            <View style={s.busqueda}>
              <TextField
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar por nombre o dirección…"
                accessibilityLabel="Buscar edificio"
                onClear={busqueda ? () => setBusqueda("") : undefined}
              />
            </View>
          ) : null}
          {visibles.length === 0 ? (
            <EmptyState icon="building" title="Ningún edificio coincide con la búsqueda" />
          ) : (
            <View style={s.rejilla}>
              {visibles.map((f) => (
                <Tarjeta key={f.edificio.id} ficha={f} editable={editable} />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Tarjeta({ ficha, editable }: { ficha: FichaDeEdificio; editable: boolean }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { edificio, participacion, cuentas } = ficha;
  const estado = estadoDelPadron(participacion, cuentas.length);
  const id = edificio.id;
  const cuenta = cuentas[0];

  return (
    <Card padding="lg" style={s.tarjeta}>
      <View style={s.portada}>
        <Image source={fotoDeEdificio(id)} style={s.foto} resizeMode="cover" accessibilityIgnoresInvertColors aria-hidden />
        <View style={s.insignia}>
          <Badge tone={estado.listo ? "success" : "warning"} label={`${estado.listo ? "✓" : "!"} ${estado.texto}`} />
        </View>
      </View>

      <View style={s.cuerpo}>
        <View style={s.titulo}>
          <Text accessibilityRole="header" style={textStyle(t, "dialogTitle")} numberOfLines={2}>
            {edificio.nombre}
          </Text>
          {edificio.direccion ? (
            <View style={s.direccion}>
              <Icon name="home" size="sm" color={t.color.text.tertiary} />
              <Text style={textStyle(t, "bodySmall", t.color.text.secondary)} numberOfLines={1}>
                {edificio.direccion}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={s.datos}>
          <Dato etiqueta="Unidades" valor={String(participacion.unidades)} />
          <Dato
            etiqueta="Participación"
            valor={participacion.unidades === 0 ? "—" : textoDePorcentaje(participacion.total)}
            alerta={participacion.unidades > 0 && !participacion.sumaCien}
          />
          <Dato etiqueta="Cuenta" valor={cuenta ? cuenta.banco : "Falta"} alerta={!cuenta} />
        </View>

        {estado.faltan.length > 1 ? (
          <View style={s.faltan}>
            {estado.faltan.slice(1).map((f) => (
              <StatusDot key={f} tone="warning" label={f} />
            ))}
          </View>
        ) : null}

        <View style={s.acciones}>
          <Button
            variant="secondary"
            label="Ver unidades"
            icon="users"
            size="sm"
            onPress={() => router.push({ pathname: "/edificios/[id]/unidades", params: { id } })}
            accessibilityLabel={`Ver las unidades de ${edificio.nombre}`}
            testID={`edificio-unidades-${id}`}
          />
          <Button
            variant="secondary"
            label="Cierre del mes"
            icon="receipt"
            size="sm"
            onPress={() => router.push({ pathname: "/edificios/[id]/cierre", params: { id } })}
            accessibilityLabel={`Abrir el cierre del mes de ${edificio.nombre}`}
          />
          {editable && !cuenta ? (
            <Button
              variant="secondary"
              label="Registrar cuenta"
              icon="landmark"
              size="sm"
              onPress={() => router.push({ pathname: "/edificios/[id]/cuentas/nueva", params: { id } })}
              accessibilityLabel={`Registrar la cuenta bancaria de ${edificio.nombre}`}
            />
          ) : null}
          {editable ? (
            <Button
              variant="ghost"
              label="Editar"
              icon="pencil"
              size="sm"
              onPress={() => router.push({ pathname: "/edificios/[id]", params: { id } })}
              accessibilityLabel={`Editar ${edificio.nombre}`}
            />
          ) : null}
        </View>
      </View>
    </Card>
  );
}

/** Un dato de la tarjeta: el rótulo chico arriba y el valor, que es lo que se lee. */
function Dato({ etiqueta, valor, alerta = false }: { etiqueta: string; valor: string; alerta?: boolean }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.dato} accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
      <Text style={textStyle(t, "caption", t.color.text.secondary)}>{etiqueta}</Text>
      <Text style={textStyle(t, "subtitle", alerta ? t.color.warning.fg : t.color.text.primary)} numberOfLines={1}>
        {alerta ? `! ${valor}` : valor}
      </Text>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: 1180, width: "100%" },
    busqueda: { maxWidth: 420 },
    rejilla: { flexDirection: "row", flexWrap: "wrap", gap: t.space.lg },
    // La foto llega al borde de la tarjeta.
    tarjeta: { flexGrow: 1, flexShrink: 1, flexBasis: 320, maxWidth: 560, padding: 0, gap: 0, overflow: "hidden" },
    portada: { height: 150 },
    foto: { width: "100%", height: "100%" },
    insignia: { position: "absolute", top: t.space.md, left: t.space.md },
    cuerpo: { padding: t.space.lg, gap: t.space.lg },
    titulo: { gap: t.space.xs },
    direccion: { flexDirection: "row", alignItems: "center", gap: t.space.xs },
    datos: {
      flexDirection: "row",
      gap: t.space.md,
      paddingVertical: t.space.md,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: t.color.border.subtle,
    },
    dato: { flex: 1, minWidth: 0, gap: t.space.xxs },
    faltan: { gap: t.space.xs },
    acciones: { flexDirection: "row", flexWrap: "wrap", gap: t.space.sm },
  });
