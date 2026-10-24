/**
 * Lo que se ve al entrar: la cartera de la administradora (PB-11).
 *
 * - **Toda la cartera:** una fila por edificio con sus unidades, si la
 *   participación suma 100 %, si tiene cuenta bancaria y el siguiente paso
 *   (H1: la causa y qué hacer). Tocar la fila elige ese edificio en el
 *   selector de contexto, que es "ir al edificio" (PB-10).
 * - **Un edificio elegido:** el mismo estado, con sus pendientes enteros.
 *   Para el administrador, cada pendiente que ya tiene pantalla lleva a ella
 *   (las unidades y su participación); la cuenta bancaria todavía no tiene.
 *   En la tabla no: la fila entera ya se toca, y un botón dentro de otro no
 *   se puede alcanzar bien con el teclado ni con el lector de pantalla.
 * - **Indicadores solo con datos (H8):** los que no tienen nada que contar no
 *   se arman. Recaudación, morosidad, incidencias y reservas no existen en la
 *   base todavía y no se muestran.
 * - **Sin edificios:** el vacío con "Registrar edificio" para quien puede
 *   registrarlos; a los demás, a quién pedírselo.
 * - En una ventana angosta la fila apila sus datos, para caber en 390 de
 *   ancho sin desplazarse de costado.
 */
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useContextoDeTrabajo } from "@/compartido/contexto/proveedor-contexto";
import { Cargando, ConOrganizacion } from "@/modulos/organizaciones/ui/con-organizacion";
import type { EdificiosPuerto } from "@/modulos/padron/aplicacion/puertos";
import { puedeEditarEdificios } from "@/modulos/padron/dominio/edificio";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Icon,
  PageHeader,
  SectionTitle,
  StatTile,
  StatusDot,
  TableHead,
  TableRow,
  Td,
  TdView,
  Th,
  textStyle,
  useStyles,
  useTheme,
  type IconName,
  type Tema,
} from "@/ui";

import type { EstadoDeLaCarteraPuerto } from "../aplicacion/puertos";
import {
  formatoPorcentaje,
  indicadoresDeLaCartera,
  type FilaCartera,
  type PasoDelCierre,
  type Pendiente,
  type TipoPendiente,
} from "../dominio/cartera";
import { useCartera } from "./usar-cartera";

/** Por debajo de este ancho de ventana, la fila apila sus datos. */
const ANCHO_ANGOSTO = 720;

const LISTO = "Listo para cobrar";

const ICONO_DEL_INDICADOR: Record<string, IconName> = { unidades: "door", "por-completar": "alert-circle" };

/** Adónde lleva cada pendiente, si ya hay una pantalla donde resolverlo. */
function irAlPaso(tipo: TipoPendiente, edificioId: string): (() => void) | null {
  switch (tipo) {
    case "sin-unidades":
      return () => router.push({ pathname: "/edificios/[id]/unidades/nueva", params: { id: edificioId } });
    case "sin-participacion":
    case "participacion-incompleta":
    case "participacion-excedida":
      return () => router.push({ pathname: "/edificios/[id]/unidades", params: { id: edificioId } });
    default:
      return null;
  }
}

/** Al paso del cierre del mes de ese edificio (PB-21). */
function irAlCierre(edificioId: string, paso: PasoDelCierre["paso"]) {
  router.push({ pathname: "/edificios/[id]/cierre", params: paso ? { id: edificioId, paso: String(paso) } : { id: edificioId } });
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

  let contenido;
  if (carga.estado === "cargando") {
    contenido = <Cargando />;
  } else if (carga.estado === "error") {
    contenido = (
      <EmptyState
        icon="refresh-cw"
        title="No se pudo leer la cartera"
        description="Revisa tu conexión y vuelve a intentarlo."
        action={<Button label="Reintentar" onPress={reintentar} />}
      />
    );
  } else if (edificio) {
    const fila = carga.filas.find((f) => f.id === edificio.id);
    contenido = fila ? (
      <DelEdificio fila={fila} editable={editable} />
    ) : (
      <EmptyState
        icon="building"
        title="No se encontró el edificio"
        action={<Button variant="secondary" label="Ver toda la cartera" onPress={() => elegirEdificio(null)} />}
      />
    );
  } else if (carga.filas.length === 0) {
    contenido = editable ? (
      <EmptyState
        icon="building"
        title="Todavía no hay edificios registrados"
        action={<Button icon="plus" label="Registrar edificio" onPress={() => router.push("/edificios/nuevo")} testID="inicio-registrar" />}
      />
    ) : (
      <EmptyState
        icon="building"
        title="Todavía no hay edificios registrados"
        description="Pide a un administrador de tu empresa que los registre."
      />
    );
  } else {
    contenido = <DeLaCartera filas={carga.filas} abrir={elegirEdificio} />;
  }

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <PageHeader title={edificio ? edificio.nombre : orgNombre} />
      {contenido}
    </ScrollView>
  );
}

function DeLaCartera({ filas, abrir }: { filas: FilaCartera[]; abrir: (id: string) => void }) {
  const s = useStyles(makeStyles);
  const indicadores = indicadoresDeLaCartera(filas);
  return (
    <>
      <View style={s.indicadores}>
        <StatTile icon="building" label={filas.length === 1 ? "Edificio" : "Edificios"} value={String(filas.length)} />
        {indicadores.map((i) => (
          <StatTile key={i.clave} icon={ICONO_DEL_INDICADOR[i.clave]} label={i.etiqueta} value={String(i.valor)} />
        ))}
      </View>
      <Tabla filas={filas} abrir={abrir} />
    </>
  );
}

function etiquetaDeFila(f: FilaCartera): string {
  const estado = f.pendientes.length === 0 ? (f.cierre?.texto ?? LISTO) : f.pendientes.map((p) => `${p.causa}: ${p.paso}`).join(". ");
  return `${f.nombre}, ${unidades(f.unidades)}. ${estado}`;
}

function Tabla({ filas, abrir }: { filas: FilaCartera[]; abrir: (id: string) => void }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  // La flecha dice que la fila se abre sin tener que pasar el puntero.
  const flecha = (
    <View style={s.flecha}>
      <Icon name="chevron-right" color={t.color.accent.text} />
    </View>
  );

  if (width < ANCHO_ANGOSTO) {
    return (
      <DataTable minWidth={0}>
        {filas.map((f) => (
          <TableRow key={f.id} onPress={() => abrir(f.id)} accessibilityLabel={etiquetaDeFila(f)}>
            <TdView flex={1} style={s.apilada}>
              <Text style={textStyle(t, "subtitle")}>{f.nombre}</Text>
              <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>
                {unidades(f.unidades)}
                {f.participacion ? ` · participación ${formatoPorcentaje(f.participacion.total)}` : ""}
              </Text>
              <SiguientePaso fila={f} />
            </TdView>
            {flecha}
          </TableRow>
        ))}
      </DataTable>
    );
  }

  return (
    <DataTable minWidth={640}>
      <TableHead>
        <Th flex={2}>Edificio</Th>
        <Th flex={1} align="right">
          Unidades
        </Th>
        <Th flex={1.2}>Participación</Th>
        <Th flex={1}>Cuenta</Th>
        <Th flex={2.4}>Siguiente paso</Th>
        <View style={s.flecha} />
      </TableHead>
      {filas.map((f) => (
        <TableRow key={f.id} onPress={() => abrir(f.id)} accessibilityLabel={etiquetaDeFila(f)}>
          <Td flex={2} style={s.fuerte}>
            {f.nombre}
          </Td>
          <Td flex={1} mono align="right">
            {f.unidades}
          </Td>
          <TdView flex={1.2}>
            {f.participacion ? (
              <StatusDot tone={f.participacion.sumaCien ? "success" : "warning"} label={formatoPorcentaje(f.participacion.total)} />
            ) : (
              <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>—</Text>
            )}
          </TdView>
          <TdView flex={1}>
            <StatusDot tone={f.tieneCuenta ? "success" : "warning"} label={f.tieneCuenta ? "Registrada" : "Falta"} />
          </TdView>
          <TdView flex={2.4}>
            <SiguientePaso fila={f} />
          </TdView>
          {flecha}
        </TableRow>
      ))}
    </DataTable>
  );
}

/**
 * El primer pendiente con su paso y su causa; si hay más, cuántos. Con el
 * padrón completo, el paso del cierre del mes, que lleva a ese paso.
 */
function SiguientePaso({ fila }: { fila: Pick<FilaCartera, "id" | "pendientes" | "cierre"> }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [primero, ...resto] = fila.pendientes as Pendiente[];
  if (!primero) {
    if (!fila.cierre) return <StatusDot tone="success" label={LISTO} />;
    if (fila.cierre.paso === null) return <StatusDot tone="success" label={fila.cierre.texto} />;
    const paso = fila.cierre.paso;
    return (
      <View style={s.enlace}>
        <Button
          variant="secondary"
          size="sm"
          label={fila.cierre.texto}
          icon="arrow-right"
          iconPosition="end"
          accessibilityLabel={`${fila.cierre.texto} en el cierre del mes`}
          onPress={() => irAlCierre(fila.id, paso)}
          testID={`inicio-cierre-${fila.id}`}
        />
      </View>
    );
  }
  return (
    <View style={s.paso}>
      <Text style={[textStyle(t, "bodySmall"), s.fuerte]}>{primero.paso}</Text>
      <StatusDot tone="warning" label={primero.causa} />
      {resto.length > 0 ? (
        <Text style={textStyle(t, "caption", t.color.text.secondary)}>
          y {resto.length} {resto.length === 1 ? "pendiente más" : "pendientes más"}
        </Text>
      ) : null}
    </View>
  );
}

function DelEdificio({ fila, editable }: { fila: FilaCartera; editable: boolean }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <>
      <View style={s.indicadores}>
        <StatTile icon="door" label="Unidades" value={String(fila.unidades)} />
        {fila.participacion ? (
          <StatTile icon="percent" label="Participación" value={formatoPorcentaje(fila.participacion.total)} />
        ) : null}
        <StatTile icon="landmark" label="Cuenta bancaria" value={fila.tieneCuenta ? "Registrada" : "Falta"} />
      </View>
      {fila.pendientes.length === 0 ? (
        <SiguientePaso fila={fila} />
      ) : (
        <View style={s.pendientes}>
          <SectionTitle>Pendientes</SectionTitle>
          {fila.pendientes.map((p) => {
            const ir = editable ? irAlPaso(p.tipo, fila.id) : null;
            return (
              <Card key={p.tipo} style={s.pendiente}>
                <View style={s.pendienteTexto}>
                  <Text style={[textStyle(t, "body"), s.fuerte]}>{p.paso}</Text>
                  <StatusDot tone="warning" label={p.causa} />
                </View>
                {ir ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    label="Resolver"
                    icon="arrow-right"
                    iconPosition="end"
                    accessibilityLabel={p.paso}
                    onPress={ir}
                    testID={`inicio-paso-${p.tipo}`}
                  />
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.xl, padding: t.space.xl, maxWidth: 1080, width: "100%" },
    indicadores: { flexDirection: "row", flexWrap: "wrap", gap: t.space.md },
    apilada: { gap: t.space.xs },
    paso: { gap: t.space.xxs },
    fuerte: { fontWeight: "600" },
    flecha: { width: 32, alignItems: "flex-end", justifyContent: "center" },
    pendientes: { gap: t.space.md, maxWidth: 720 },
    pendiente: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: t.space.md },
    pendienteTexto: { flexGrow: 1, flexShrink: 1, minWidth: 200, gap: t.space.xs },
    enlace: { alignSelf: "flex-start" },
  });
