/**
 * El cierre mensual de un edificio en un solo recorrido (PB-13): Lecturas,
 * Presupuesto, Revisar recibos y Emitir.
 *
 * - El indicador marca el paso que se mira, los hechos con ✓ y texto, y el
 *   de emitir como bloqueado mientras una validación lo impida.
 * - "Guardar borrador" guarda lo cargado y el paso; al volver se retoma ahí.
 * - "Continuar" guarda y, si falta algo, dice qué al lado del botón en vez de
 *   quedar atenuado sin motivo.
 * - El periodo es el mes en curso en Lima. Si ya está emitido, se abre ese
 *   cierre, que ya no cambia: no hay dos cierres del mismo periodo.
 */
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Cargando, ConOrganizacion } from "@/modulos/organizaciones/ui/con-organizacion";
import { Volver } from "@/compartido/ui/piezas";
import { Button, EmptyState, ScreenTitle, StepCards, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import { abrirCierre, mensajeDeCobranza } from "../aplicacion/casos-de-uso";
import type { CobranzaPuerto, EdificioDelCierre } from "../aplicacion/puertos";
import {
  claveDePaso,
  estadosDeLosPasos,
  PASOS,
  pasoAlcanzable,
  pasoDeClave,
  queFaltaParaContinuar,
  type AvanceDelCierre,
  type Cierre,
  type ClaveDePaso,
  type NumeroDePaso,
} from "../dominio/cierre";
import { textoDeSoles } from "../dominio/dinero";
import { avanceDeLecturas, type Lectura } from "../dominio/lectura";
import { hoyEnLima, periodoDe, textoDePeriodo } from "../dominio/periodo";
import type { Partida } from "../dominio/presupuesto";
import { resumenDePrevia, type FilaPrevia, type Recibo } from "../dominio/recibo";
import { bloqueantes, motivoParaNoEmitir, validacionesDelCierre, type DestinoDeAccion, type EstadoDelPadron, type Validacion } from "../dominio/validaciones";
import type { PasoAbierto } from "./paso";
import { PasoEmision } from "./paso-emision";
import { PasoLecturas } from "./paso-lecturas";
import { PasoPresupuesto } from "./paso-presupuesto";
import { PasoRevision } from "./paso-revision";

export function PantallaCierre({ cobranza, edificioId, paso }: { cobranza: CobranzaPuerto; edificioId: string; paso?: string }) {
  return (
    <ConOrganizacion>
      {(enCurso) => (
        <Inicio
          key={`${enCurso.orgId}-${edificioId}`}
          cobranza={cobranza}
          orgId={enCurso.orgId}
          edificioId={edificioId}
          editable={enCurso.rol === "administrador"}
          pasoPedido={paso ? (pasoDeClave(paso) ?? (Number(paso) as NumeroDePaso)) : undefined}
        />
      )}
    </ConOrganizacion>
  );
}

const irAlEdificio = (edificioId: string) => router.navigate({ pathname: "/edificios/[id]/unidades", params: { id: edificioId } });

function Inicio({
  cobranza,
  orgId,
  edificioId,
  editable,
  pasoPedido,
}: {
  cobranza: CobranzaPuerto;
  orgId: string;
  edificioId: string;
  editable: boolean;
  pasoPedido?: NumeroDePaso;
}) {
  const s = useStyles(makeStyles);
  const periodo = periodoDe(hoyEnLima());
  const [estado, setEstado] = useState<
    { tipo: "cargando" } | { tipo: "error" } | { tipo: "listo"; edificio: EdificioDelCierre | null; cierre: Cierre | null }
  >({ tipo: "cargando" });
  const [abriendo, setAbriendo] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  const pedir = useCallback(
    () => Promise.all([cobranza.edificio(orgId, edificioId), cobranza.cierreDelPeriodo(orgId, edificioId, periodo)]),
    [cobranza, orgId, edificioId, periodo],
  );
  const leer = useCallback(
    () =>
      pedir().then(
        ([edificio, cierre]) => setEstado({ tipo: "listo", edificio, cierre }),
        () => setEstado({ tipo: "error" }),
      ),
    [pedir],
  );

  useEffect(() => {
    let vigente = true;
    pedir().then(
      ([edificio, cierre]) => vigente && setEstado({ tipo: "listo", edificio, cierre }),
      () => vigente && setEstado({ tipo: "error" }),
    );
    return () => {
      vigente = false;
    };
  }, [pedir]);

  if (estado.tipo === "cargando") return <Cargando />;
  if (estado.tipo === "error" || !estado.edificio) {
    return (
      <ScrollView contentContainerStyle={s.pantalla}>
        <Volver label="Edificios" onPress={() => router.navigate("/edificios")} />
        {estado.tipo === "error" ? (
          <EmptyState
            title="No se pudo leer el cierre"
            description="Revisa tu conexión y vuelve a intentarlo."
            action={<Button label="Reintentar" onPress={leer} />}
          />
        ) : (
          <EmptyState title="Este edificio no está en la cartera" />
        )}
      </ScrollView>
    );
  }

  const edificio = estado.edificio;
  if (!estado.cierre) {
    const empezar = async () => {
      setAbriendo(true);
      setFallo(null);
      const r = await abrirCierre(cobranza, edificioId, periodo);
      setAbriendo(false);
      if (r.ok) void leer();
      else setFallo(mensajeDeCobranza(r.fallo));
    };
    return (
      <ScrollView contentContainerStyle={s.pantalla}>
        <Volver label={edificio.nombre} onPress={() => irAlEdificio(edificioId)} />
        <EmptyState
          title={`Cierre de ${textoDePeriodo(periodo)}`}
          description={
            fallo ??
            (editable
              ? "Lecturas, presupuesto, revisión y emisión de los recibos del mes, en cuatro pasos."
              : "Todavía no empezó. Lo empieza un administrador.")
          }
          action={editable ? <Button label="Empezar el cierre" loading={abriendo} onPress={empezar} testID="cierre-empezar" /> : undefined}
        />
      </ScrollView>
    );
  }

  return <Asistente cobranza={cobranza} orgId={orgId} edificio={edificio} inicial={estado.cierre} editable={editable} pasoPedido={pasoPedido} />;
}

interface Datos {
  cierre: Cierre;
  lecturas: Lectura[];
  partidas: Partida[];
  padron: EstadoDelPadron;
  previa: FilaPrevia[];
  recibos: Recibo[];
}

function validacionesDe(d: Datos): Validacion[] {
  return validacionesDelCierre(d.padron, {
    sinLectura: d.previa.filter((f) => f.sinLectura).length,
    atipicos: d.previa.filter((f) => f.atipico).length,
  });
}

function Asistente({
  cobranza,
  orgId,
  edificio,
  inicial,
  editable: puedeEditar,
  pasoPedido,
}: {
  cobranza: CobranzaPuerto;
  orgId: string;
  edificio: EdificioDelCierre;
  inicial: Cierre;
  editable: boolean;
  pasoPedido?: NumeroDePaso;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [falloAlLeer, setFalloAlLeer] = useState(false);
  const [visto, setVisto] = useState<NumeroDePaso>(() =>
    inicial.estado === "emitido" ? 4 : pasoPedido && pasoAlcanzable(inicial, pasoPedido) ? pasoPedido : inicial.paso,
  );
  const [lecturasConError, setLecturasConError] = useState(0);
  const [mensaje, setMensaje] = useState<{ texto: string; tono: "falta" | "ok" } | null>(null);
  const [ocupado, setOcupado] = useState<"borrador" | "continuar" | null>(null);
  const [soloAlerta, setSoloAlerta] = useState(false);
  const pasoAbierto = useRef<PasoAbierto>(null);

  const pedir = useCallback(async (): Promise<Datos> => {
    const cierre = (await cobranza.cierre(orgId, inicial.id)) ?? inicial;
    const [lecturas, partidas, padron, previa, recibos] = await Promise.all([
      cobranza.lecturas(orgId, cierre.id),
      cobranza.partidas(orgId, cierre.id),
      cobranza.padron(orgId, cierre.edificioId),
      cobranza.vistaPrevia(cierre.id),
      cierre.estado === "emitido" ? cobranza.recibosDelCierre(orgId, cierre.id) : Promise.resolve<Recibo[]>([]),
    ]);
    return { cierre, lecturas, partidas, padron, previa, recibos };
  }, [cobranza, orgId, inicial]);

  const cargar = useCallback(
    (): Promise<Datos | null> =>
      pedir().then(
        (d) => {
          setDatos(d);
          setFalloAlLeer(false);
          return d;
        },
        () => {
          setFalloAlLeer(true);
          return null;
        },
      ),
    [pedir],
  );

  useEffect(() => {
    let vigente = true;
    pedir().then(
      (d) => vigente && setDatos(d),
      () => vigente && setFalloAlLeer(true),
    );
    return () => {
      vigente = false;
    };
  }, [pedir]);

  const recargar = useCallback(() => void cargar(), [cargar]);

  if (!datos) {
    if (!falloAlLeer) return <Cargando />;
    return (
      <ScrollView contentContainerStyle={s.pantalla}>
        <EmptyState
          title="No se pudo leer el cierre"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={recargar} />}
        />
      </ScrollView>
    );
  }

  const { cierre } = datos;
  const editable = puedeEditar && cierre.estado === "borrador";
  const validaciones = validacionesDe(datos);
  const avanceDe = (d: Datos): AvanceDelCierre => ({
    lecturasConError,
    montoAguaEscrito: d.cierre.montoAgua > 0 || d.previa.every((f) => f.consumo === null),
    partidas: d.partidas.length,
    bloqueantes: bloqueantes(validacionesDe(d)).length,
  });
  const estados = estadosDeLosPasos(cierre, avanceDe(datos));
  const resumen = resumenDePrevia(datos.previa);
  const detalle: Record<NumeroDePaso, string> = {
    1: avanceDeLecturas(datos.lecturas).texto,
    2: datos.partidas.length > 0 ? `Total ${textoDeSoles(datos.partidas.reduce((n, p) => n + p.monto, 0))}` : "Sin partidas",
    3: bloqueantes(validaciones).length > 0 ? `${bloqueantes(validaciones).length} validaciones bloquean` : `${resumen.conAlerta} con alerta`,
    4: cierre.estado === "emitido" ? `${datos.recibos.length} emitidos` : "Por emitir",
  };

  async function guardarPaso(): Promise<boolean> {
    return pasoAbierto.current ? pasoAbierto.current.guardar() : true;
  }

  async function guardarBorrador() {
    setOcupado("borrador");
    setMensaje(null);
    const ok = await guardarPaso();
    const r = await cobranza.guardarCierre(orgId, cierre.id, { paso: Math.max(cierre.paso, visto) as NumeroDePaso });
    await cargar();
    setOcupado(null);
    setMensaje(
      ok && r.ok
        ? { texto: "Borrador guardado. Al volver, el cierre sigue en este paso.", tono: "ok" }
        : { texto: r.ok ? "Hay datos marcados que no se guardaron." : mensajeDeCobranza(r.fallo), tono: "falta" },
    );
  }

  async function continuar() {
    setOcupado("continuar");
    setMensaje(null);
    const ok = await guardarPaso();
    const d = await cargar();
    if (!d) {
      setOcupado(null);
      return;
    }
    const falta = queFaltaParaContinuar(visto, avanceDe(d)) ?? (ok ? null : "Hay datos marcados que no se guardaron");
    if (falta) {
      setOcupado(null);
      setMensaje({ texto: falta, tono: "falta" });
      return;
    }
    const siguiente = (visto + 1) as NumeroDePaso;
    const r = await cobranza.guardarCierre(orgId, cierre.id, { paso: Math.max(d.cierre.paso, siguiente) as NumeroDePaso });
    await cargar();
    setOcupado(null);
    if (!r.ok) {
      setMensaje({ texto: mensajeDeCobranza(r.fallo), tono: "falta" });
      return;
    }
    setSoloAlerta(false);
    setVisto(siguiente);
  }

  async function irA(clave: ClaveDePaso) {
    const destino = pasoDeClave(clave);
    if (!destino || destino === visto) return;
    if (editable) await guardarPaso();
    setMensaje(null);
    setSoloAlerta(false);
    setVisto(destino);
    void cargar();
  }

  function accion(destino: DestinoDeAccion) {
    if (destino === "padron") router.push({ pathname: "/edificios/[id]/unidades", params: { id: cierre.edificioId } });
    else if (destino === "cuentas") router.push({ pathname: "/edificios/[id]/cuentas/nueva", params: { id: cierre.edificioId } });
    else if (destino === "lecturas") void irA("lecturas");
    else {
      setSoloAlerta(true);
      void irA("revision");
    }
  }

  return (
    <ScrollView contentContainerStyle={s.pantalla} keyboardShouldPersistTaps="handled">
      <Volver label={edificio.nombre} onPress={() => irAlEdificio(cierre.edificioId)} />
      <View style={s.cabecera}>
        <ScreenTitle>{`Cierre de ${textoDePeriodo(cierre.periodo)}`}</ScreenTitle>
        <Text style={textStyle(t, "body", cierre.estado === "emitido" ? t.color.success.fg : t.color.text.secondary)}>
          {cierre.estado === "emitido" ? "✓ Emitido" : "Borrador"}
        </Text>
      </View>

      <StepCards
        accessibilityLabel="Pasos del cierre"
        value={claveDePaso(visto)}
        onChange={(clave) => void irA(clave)}
        steps={PASOS.map((p) => ({
          key: p.clave,
          label: p.titulo,
          detail: detalle[p.paso],
          status: p.paso === visto && estados[p.paso] !== "done" ? "current" : estados[p.paso],
          disabled: !pasoAlcanzable(cierre, p.paso),
        }))}
      />

      {visto === 1 ? (
        <PasoLecturas
          key={`lecturas-${cierre.estado}`}
          ref={pasoAbierto}
          cobranza={cobranza}
          orgId={orgId}
          cierre={cierre}
          lecturas={datos.lecturas}
          editable={editable}
          onErrores={setLecturasConError}
          onGuardado={recargar}
        />
      ) : visto === 2 ? (
        <PasoPresupuesto
          ref={pasoAbierto}
          cobranza={cobranza}
          orgId={orgId}
          cierre={cierre}
          partidas={datos.partidas}
          unidades={datos.previa}
          participacion={validaciones[0]}
          editable={editable}
          onGuardado={recargar}
        />
      ) : visto === 3 ? (
        <PasoRevision
          key={soloAlerta ? "alerta" : "todas"}
          cierre={cierre}
          edificio={edificio.nombre}
          filas={datos.previa}
          validaciones={validaciones}
          soloAlertaAlAbrir={soloAlerta}
          onAccion={accion}
        />
      ) : (
        <PasoEmision
          cobranza={cobranza}
          orgId={orgId}
          cierre={cierre}
          edificio={edificio.nombre}
          filas={datos.previa}
          recibos={datos.recibos}
          motivo={motivoParaNoEmitir(validaciones)}
          editable={puedeEditar}
          onEmitido={recargar}
        />
      )}

      {editable && visto < 4 ? (
        <View style={s.pie}>
          {mensaje ? (
            <Text
              accessibilityRole="alert"
              style={[textStyle(t, "body", mensaje.tono === "ok" ? t.color.success.fg : t.color.danger.fg), s.mensaje]}
            >
              {`${mensaje.tono === "ok" ? "✓" : "!"} ${mensaje.texto}`}
            </Text>
          ) : (
            <View style={s.mensaje} />
          )}
          <Button variant="secondary" label="Guardar borrador" loading={ocupado === "borrador"} disabled={ocupado !== null} onPress={guardarBorrador} />
          <Button label="Continuar" loading={ocupado === "continuar"} disabled={ocupado !== null} onPress={continuar} testID="cierre-continuar" />
        </View>
      ) : null}
    </ScrollView>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: 1080, width: "100%" },
    cabecera: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", gap: t.space.md },
    pie: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: t.space.sm,
      paddingTop: t.space.md,
      borderTopWidth: 1,
      borderTopColor: t.color.border.subtle,
    },
    mensaje: { flexGrow: 1, flexBasis: 240 },
  });
