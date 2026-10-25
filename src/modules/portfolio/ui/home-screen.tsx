/**
 * Lo que se ve al entrar: la cartera de la administradora (PB-11, PB-21).
 *
 * - **Toda la cartera:** arriba, cuántos edificios ya emitieron el mes y
 *   la lista de lo que hay que hacer, con lo del padrón primero (sin eso no
 *   se cobra) y después el paso del cierre de cada edificio. Cada tarea lleva
 *   adonde se resuelve. Debajo, una tarjeta por edificio con su estado en
 *   palabras y una foto de portada (genérica por ahora); tocarla elige ese edificio en el selector de contexto, que es
 *   "ir al edificio" (PB-10).
 * - **Un edificio elegido:** el botón del siguiente paso junto al título, el
 *   recorrido del cierre del mes, sus pendientes y su padrón.
 * - **Solo con datos (H8):** no se pinta recaudación, morosidad ni nada que
 *   la base no tenga todavía.
 * - **Sin edificios:** el vacío con "Registrar edificio" para quien puede
 *   registrarlos; a los demás, a quién pedírselo.
 * - En una ventana angosta todo va en una columna, para caber en 375 de
 *   ancho sin desplazarse de costado.
 */
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";

import { fotoDeEdificio } from "@/shared/ui/building-photo";
import { FlechaDeFila } from "@/shared/ui/pieces";
import { useContextoDeTrabajo } from "@/shared/context/context-provider";
import { textoCortoDePeriodo, textoDePeriodo } from "@/modules/billing/domain/period";
import { Cargando, ConOrganizacion } from "@/modules/organizations/ui/with-organization";
import type { EdificiosPuerto } from "@/modules/registry/application/ports";
import { puedeEditarEdificios } from "@/modules/registry/domain/building";
import { ANCHO_DE_PANTALLA } from "@/shared/ui/layout";
import {
  Badge,
  Button,
  Card,
  CardGrid,
  DataTable,
  EmptyState,
  Icon,
  Meter,
  PageHeader,
  SectionTitle,
  StageTrack,
  StatusDot,
  TableRow,
  TdView,
  textStyle,
  useStyles,
  useTheme,
  type IconName,
  type StatusTone,
  type Tema,
} from "@/ui";

import type { EstadoDeLaCarteraPuerto } from "../application/ports";
import {
  estadoDelEdificio,
  formatoPorcentaje,
  periodoEnCurso,
  resumenDelMes,
  tareasDeLaCartera,
  TEXTO_DEL_ESTADO,
  type EstadoDelEdificio,
  type FilaCartera,
  type Tarea,
} from "../domain/portfolio";
import { useCartera } from "./use-portfolio";

/** Desde este ancho de ventana, el resumen y las tareas van lado a lado. */
const ANCHO_DOS_COLUMNAS = 960;

const PASOS_DEL_CIERRE = [
  { key: "1", label: "Lecturas" },
  { key: "2", label: "Presupuesto" },
  { key: "3", label: "Revisar" },
  { key: "4", label: "Emitir" },
];

const ESTADO: Record<EstadoDelEdificio, { tono: StatusTone; signo: string }> = {
  "por-completar": { tono: "warning", signo: "! " },
  "en-cierre": { tono: "info", signo: "" },
  "al-dia": { tono: "success", signo: "✓ " },
};

const ICONO_DE_TAREA: Record<Tarea["tipo"], IconName> = {
  "sin-unidades": "door",
  "sin-participacion": "percent",
  "participacion-incompleta": "percent",
  "participacion-excedida": "percent",
  "sin-cuenta": "landmark",
  cierre: "receipt",
};

/** Adónde lleva cada tarea, si ya hay una pantalla donde resolverla y el rol puede. */
function irALaTarea(tarea: Tarea, editable: boolean): (() => void) | null {
  const id = tarea.edificioId;
  switch (tarea.tipo) {
    case "cierre":
      return () => irAlCierre(id, tarea.pasoDelCierre ?? null);
    case "sin-unidades":
      return editable ? () => router.push({ pathname: "/buildings/[id]/units/new", params: { id } }) : null;
    case "sin-cuenta":
      return editable ? () => router.push({ pathname: "/buildings/[id]/accounts/new", params: { id } }) : null;
    default:
      return editable ? () => router.push({ pathname: "/buildings/[id]/units", params: { id } }) : null;
  }
}

/** Al cierre del mes de ese edificio, en el paso que toca (PB-21). */
function irAlCierre(edificioId: string, paso: number | null) {
  router.push({ pathname: "/buildings/[id]/closing", params: paso ? { id: edificioId, paso: String(paso) } : { id: edificioId } });
}

function unidades(n: number): string {
  return `${n} ${n === 1 ? "unidad" : "unidades"}`;
}

export function PantallaInicio({ edificios, estado }: { edificios: EdificiosPuerto; estado: EstadoDeLaCarteraPuerto }) {
  return (
    <ConOrganizacion>
      {(enCurso) => (
        // La clave descarta la cartera anterior al cambiar de administradora.
        <Cartera
          key={enCurso.orgId}
          orgId={enCurso.orgId}
          orgNombre={enCurso.orgNombre}
          editable={puedeEditarEdificios(enCurso.rol)}
          edificios={edificios}
          estado={estado}
        />
      )}
    </ConOrganizacion>
  );
}

function Cartera({
  orgId,
  orgNombre,
  editable,
  edificios,
  estado,
}: {
  orgId: string;
  orgNombre: string;
  editable: boolean;
  edificios: EdificiosPuerto;
  estado: EstadoDeLaCarteraPuerto;
}) {
  const s = useStyles(makeStyles);
  const { edificio, elegirEdificio } = useContextoDeTrabajo();
  const { carga, reintentar } = useCartera(edificios, estado, orgId);

  if (carga.estado === "cargando") return <Cargando />;

  let contenido;
  if (carga.estado === "error") {
    contenido = (
      <>
        <PageHeader title={edificio ? edificio.nombre : orgNombre} />
        <EmptyState
          icon="refresh-cw"
          title="No se pudo leer la cartera"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      </>
    );
  } else if (edificio) {
    const fila = carga.filas.find((f) => f.id === edificio.id);
    contenido = fila ? (
      <DelEdificio fila={fila} editable={editable} />
    ) : (
      <>
        <PageHeader title={edificio.nombre} />
        <EmptyState
          icon="building"
          title="No se encontró el edificio"
          action={<Button variant="secondary" label="Ver toda la cartera" onPress={() => elegirEdificio(null)} />}
        />
      </>
    );
  } else if (carga.filas.length === 0) {
    contenido = (
      <>
        <PageHeader title={orgNombre} />
        {editable ? (
          <EmptyState
            icon="building"
            title="Todavía no hay edificios registrados"
            action={<Button icon="plus" label="Registrar edificio" onPress={() => router.push("/buildings/new")} testID="inicio-registrar" />}
          />
        ) : (
          <EmptyState
            icon="building"
            title="Todavía no hay edificios registrados"
            description="Pide a un administrador de tu empresa que los registre."
          />
        )}
      </>
    );
  } else {
    contenido = (
      <>
        <PageHeader title={orgNombre} />
        <DeLaCartera filas={carga.filas} editable={editable} abrir={elegirEdificio} />
      </>
    );
  }

  return <ScrollView contentContainerStyle={s.pantalla}>{contenido}</ScrollView>;
}

function DeLaCartera({ filas, editable, abrir }: { filas: FilaCartera[]; editable: boolean; abrir: (id: string) => void }) {
  const s = useStyles(makeStyles);
  const ancho = useWindowDimensions().width >= ANCHO_DOS_COLUMNAS;
  const tareas = tareasDeLaCartera(filas);
  return (
    <>
      <View style={ancho ? s.dosColumnas : s.columna}>
        <ResumenDelMes filas={filas} style={ancho ? s.colResumen : undefined} />
        <PorHacer tareas={tareas} editable={editable} conEdificio style={ancho ? s.colTareas : undefined} />
      </View>
      <View style={s.columna}>
        <SectionTitle>Edificios</SectionTitle>
        <CardGrid minItemWidth={280} maxColumns={4}>
          {filas.map((f) => (
            <TarjetaDeEdificio key={f.id} fila={f} onPress={() => abrir(f.id)} />
          ))}
        </CardGrid>
      </View>
    </>
  );
}

/** Cuántos edificios ya emitieron los recibos del mes, con las casillas de los que faltan. */
function ResumenDelMes({ filas, style }: { filas: FilaCartera[]; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const r = resumenDelMes(filas);
  return (
    // El título va fuera de la tarjeta, como el de "Por hacer": las dos columnas arrancan a la misma altura.
    <View style={[s.columna, style]}>
      <SectionTitle>{textoCortoDePeriodo(periodoEnCurso())}</SectionTitle>
      <Card padding="lg" style={s.tarjeta}>
      <View accessible accessibilityLabel={`${r.alDia} de ${r.edificios} edificios con el mes emitido`}>
        <Text style={textStyle(t, "display")}>
          {r.alDia}
          <Text style={textStyle(t, "title", t.color.text.secondary)}>{` de ${r.edificios}`}</Text>
        </Text>
        <Text style={textStyle(t, "body", t.color.text.secondary)}>{r.edificios === 1 ? "edificio con el mes emitido" : "edificios con el mes emitido"}</Text>
      </View>
      <Meter value={r.alDia} total={r.edificios} unit="edificios con el mes emitido" label="" />
      <View style={s.leyenda}>
        {r.enCierre > 0 ? <StatusDot tone="info" label={`${r.enCierre} en cierre`} /> : null}
        {r.porCompletar > 0 ? <StatusDot tone="warning" label={`${r.porCompletar} por completar`} /> : null}
      </View>
      </Card>
    </View>
  );
}

/** Lo que hay que hacer, una fila por tarea, cada una con su destino. */
function PorHacer({ tareas, editable, conEdificio, style }: { tareas: Tarea[]; editable: boolean; conEdificio: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    // La tabla ya es la tarjeta: dentro de otra, en un teléfono, el texto se queda sin ancho.
    <View style={[s.columna, style]}>
      <View style={s.titulo}>
        <SectionTitle>Por hacer</SectionTitle>
        {tareas.length > 0 ? <Badge label={String(tareas.length)} /> : null}
      </View>
      {tareas.length === 0 ? (
        <Card padding="lg" style={s.alDia}>
          <Icon name="check-circle" color={t.color.success.fg} />
          <Text style={textStyle(t, "body")}>Nada pendiente este mes.</Text>
        </Card>
      ) : (
        <DataTable minWidth={0}>
          {tareas.map((tarea) => {
            const ir = irALaTarea(tarea, editable);
            const detalle = conEdificio ? `${tarea.edificio} · ${tarea.causa}` : tarea.causa;
            return (
              <TableRow
                key={`${tarea.edificioId}-${tarea.tipo}`}
                onPress={ir ?? undefined}
                accessibilityLabel={`${tarea.paso}. ${detalle}`}
              >
                <IconoDeTarea tarea={tarea} />
                <TdView flex={1} style={s.apilada}>
                  <Text style={[textStyle(t, "body"), s.fuerte]}>{tarea.paso}</Text>
                  <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{detalle}</Text>
                </TdView>
                {ir ? <FlechaDeFila /> : null}
              </TableRow>
            );
          })}
        </DataTable>
      )}
    </View>
  );
}

function IconoDeTarea({ tarea }: { tarea: Tarea }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const delPadron = tarea.tipo !== "cierre";
  return (
    <View style={[s.iconoTarea, { backgroundColor: delPadron ? t.color.warning.bg : t.color.accent.subtle }]}>
      <Icon name={ICONO_DE_TAREA[tarea.tipo]} size="sm" color={delPadron ? t.color.warning.fg : t.color.accent.text} />
    </View>
  );
}

function InsigniaDeEstado({ estado }: { estado: EstadoDelEdificio }) {
  return <Badge tone={ESTADO[estado].tono} label={`${ESTADO[estado].signo}${TEXTO_DEL_ESTADO[estado]}`} />;
}

/** Un edificio: su nombre, sus unidades, su estado y lo que le toca. Se toca entera. */
function TarjetaDeEdificio({ fila, onPress }: { fila: FilaCartera; onPress: () => void }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const estado = estadoDelEdificio(fila);
  const [primero, ...resto] = fila.pendientes;
  const paso = fila.cierre?.paso ?? null;

  let detalle;
  let leido: string;
  if (primero) {
    detalle = (
      <View style={s.apilada}>
        <StatusDot tone="warning" label={primero.causa} />
        {resto.length > 0 ? (
          <Text style={textStyle(t, "caption", t.color.text.secondary)}>
            y {resto.length} {resto.length === 1 ? "pendiente más" : "pendientes más"}
          </Text>
        ) : null}
      </View>
    );
    leido = fila.pendientes.map((p) => p.causa).join(". ");
  } else if (paso) {
    detalle = <Meter value={paso - 1} total={4} unit="pasos del cierre" label={`Paso ${paso} de 4 · ${fila.cierre?.texto}`} />;
    leido = `Paso ${paso} de 4 del cierre: ${fila.cierre?.texto}`;
  } else {
    detalle = <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>Recibos del mes emitidos</Text>;
    leido = "Recibos del mes emitidos";
  }

  return (
    <Card
      padding="lg"
      style={s.edificio}
      onPress={onPress}
      accessibilityLabel={`${fila.nombre}, ${unidades(fila.unidades)}. ${TEXTO_DEL_ESTADO[estado]}. ${leido}`}
      testID={`inicio-edificio-${fila.id}`}
    >
      <View style={s.portada}>
        <Image source={fotoDeEdificio(fila.id)} style={s.foto} resizeMode="cover" accessibilityIgnoresInvertColors aria-hidden />
        <View style={s.insigniaSobreFoto}>
          <InsigniaDeEstado estado={estado} />
        </View>
      </View>
      <View style={s.cuerpoEdificio}>
        <View style={s.cabezaEdificio}>
          <View style={s.nombre}>
            <Text style={textStyle(t, "subtitle")} numberOfLines={2}>
              {fila.nombre}
            </Text>
            <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{unidades(fila.unidades)}</Text>
          </View>
          <FlechaDeFila />
        </View>
        {detalle}
      </View>
    </Card>
  );
}

function DelEdificio({ fila, editable }: { fila: FilaCartera; editable: boolean }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const ancho = useWindowDimensions().width >= ANCHO_DOS_COLUMNAS;
  const estado = estadoDelEdificio(fila);
  const tareas = tareasDeLaCartera([fila]);
  const siguiente = tareas[0];
  const ir = siguiente ? irALaTarea(siguiente, editable) : null;
  const paso = fila.cierre?.paso ?? null;

  return (
    <>
      <PageHeader
        title={fila.nombre}
        status={<InsigniaDeEstado estado={estado} />}
        actions={
          siguiente && ir ? (
            <Button label={siguiente.paso} icon="arrow-right" iconPosition="end" onPress={ir} testID="inicio-siguiente" />
          ) : estado === "al-dia" ? (
            <Button variant="secondary" label="Ver el cierre" onPress={() => irAlCierre(fila.id, null)} testID="inicio-ver-cierre" />
          ) : null
        }
      />
      <View style={ancho ? s.dosColumnas : s.columna}>
        <View style={[s.columna, ancho ? s.colTareas : undefined]}>
          {fila.pendientes.length === 0 ? (
            <Card padding="lg" style={s.tarjeta}>
              <SectionTitle>{`Cierre de ${textoDePeriodo(periodoEnCurso())}`}</SectionTitle>
              {paso ? (
                <StageTrack
                  stages={PASOS_DEL_CIERRE}
                  current={String(paso)}
                  compact={!ancho}
                  accessibilityLabel="Pasos del cierre del mes"
                />
              ) : (
                <View style={s.alDia}>
                  <Icon name="check-circle" color={t.color.success.fg} />
                  <Text style={textStyle(t, "body")}>Recibos del mes emitidos.</Text>
                </View>
              )}
            </Card>
          ) : (
            <PorHacer tareas={tareas} editable={editable} conEdificio={false} />
          )}
        </View>
        <Card padding="lg" style={[s.tarjeta, ancho ? s.colResumen : undefined]}>
          <SectionTitle>Padrón</SectionTitle>
          <Dato etiqueta="Unidades">
            <Text style={textStyle(t, "data")}>{String(fila.unidades)}</Text>
          </Dato>
          <Dato etiqueta="Participación">
            <Text style={textStyle(t, "data")}>{fila.participacion ? formatoPorcentaje(fila.participacion.total) : "—"}</Text>
            {fila.participacion && !fila.participacion.sumaCien ? <StatusDot tone="warning" label="No suma 100 %" /> : null}
          </Dato>
          <Dato etiqueta="Cuenta bancaria">
            <StatusDot tone={fila.tieneCuenta ? "success" : "warning"} label={fila.tieneCuenta ? "Registrada" : "Falta"} />
          </Dato>
          <Button
            variant="ghost"
            size="sm"
            label="Ver unidades"
            icon="arrow-right"
            iconPosition="end"
            onPress={() => router.push({ pathname: "/buildings/[id]/units", params: { id: fila.id } })}
            style={s.enlace}
          />
        </Card>
      </View>
    </>
  );
}

/** Un dato del padrón: la etiqueta a la izquierda y el valor, con su estado si falla, a la derecha. */
function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.dato}>
      <Text style={textStyle(t, "body", t.color.text.secondary)}>{etiqueta}</Text>
      <View style={s.valor}>{children}</View>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.xl, padding: t.space.xl, maxWidth: ANCHO_DE_PANTALLA, width: "100%" },
    columna: { gap: t.space.lg },
    dosColumnas: { flexDirection: "row", alignItems: "flex-start", gap: t.space.lg },
    colResumen: { flexBasis: 320, flexGrow: 0, flexShrink: 0 },
    colTareas: { flex: 1, minWidth: 0 },
    tarjeta: { gap: t.space.md },
    titulo: { flexDirection: "row", alignItems: "center", gap: t.space.sm },
    leyenda: { flexDirection: "row", flexWrap: "wrap", columnGap: t.space.lg, rowGap: t.space.xs },
    alDia: { flexDirection: "row", alignItems: "center", gap: t.space.sm, flexWrap: "wrap" },
    apilada: { gap: t.space.xxs },
    fuerte: { fontWeight: "600" },
    iconoTarea: { width: 36, height: 36, borderRadius: t.radius.sm, alignItems: "center", justifyContent: "center" },
    // La foto llega al borde de la tarjeta: sin relleno ni separación arriba.
    edificio: { flexGrow: 1, padding: 0, gap: 0, overflow: "hidden" },
    portada: { height: 132 },
    foto: { width: "100%", height: "100%" },
    insigniaSobreFoto: { position: "absolute", top: t.space.md, left: t.space.md },
    cuerpoEdificio: { padding: t.space.lg, gap: t.space.md },
    cabezaEdificio: { flexDirection: "row", alignItems: "flex-start", gap: t.space.md },
    iconoEdificio: {
      width: 40,
      height: 40,
      borderRadius: t.radius.sm,
      backgroundColor: t.color.accent.subtle,
      alignItems: "center",
      justifyContent: "center",
    },
    nombre: { flex: 1, minWidth: 0, gap: t.space.xxs },
    dato: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: t.space.sm },
    valor: { alignItems: "flex-end", gap: t.space.xxs },
    enlace: { alignSelf: "flex-start", marginLeft: -t.space.md },
  });
