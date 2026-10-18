/**
 * Lo que se ve al entrar. Por ahora dice solo lo que la base sabe: a qué
 * administradora pertenece la persona y si ya tiene edificios; con un
 * edificio elegido en el selector de contexto, cuántas unidades tiene ese
 * edificio (PB-10). La tabla de la cartera llega con PB-11.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { useContextoDeTrabajo } from "@/compartido/contexto/proveedor-contexto";
import { useOrganizacion } from "@/modulos/organizaciones/ui/organizacion";
import type { EdificiosPuerto } from "@/modulos/padron/aplicacion/puertos";
import { Button, Card, EmptyState, KeyValueRow, ScreenTitle, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import type { UnidadesPuerto } from "../aplicacion/puertos";

type Conteo = { estado: "cargando" } | { estado: "error" } | { estado: "listo"; total: number };

export function PantallaInicio({ edificios, unidades }: { edificios: EdificiosPuerto; unidades: UnidadesPuerto }) {
  const s = useStyles(makeStyles);
  const { carga, enCurso, reintentar } = useOrganizacion();
  const { edificio } = useContextoDeTrabajo();
  const [intento, setIntento] = useState(0);

  if (carga === "cargando") return <Cargando />;

  if (carga === "error") {
    return (
      <View style={s.pantalla}>
        <EmptyState
          title="No se pudo leer tu cuenta"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      </View>
    );
  }

  if (!enCurso) {
    return (
      <View style={s.pantalla}>
        <EmptyState
          title="Tu cuenta no está en ninguna administradora"
          description="Pide a quien administra tu empresa que te invite."
        />
      </View>
    );
  }

  const orgId = enCurso.orgId;
  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <ScreenTitle>{edificio ? edificio.nombre : enCurso.orgNombre}</ScreenTitle>
      {/* La clave reinicia el conteo al cambiar de administradora, de edificio o al reintentar. */}
      {edificio ? (
        <Resumen
          key={`${orgId}-${edificio.id}-${intento}`}
          rotulo="Unidades registradas"
          vacio="Este edificio todavía no tiene unidades registradas"
          errorTitulo="No se pudieron leer las unidades"
          contar={() => unidades.contarDelEdificio(orgId, edificio.id)}
          onReintentar={() => setIntento((n) => n + 1)}
        />
      ) : (
        <Resumen
          key={`${orgId}-${intento}`}
          rotulo="Edificios registrados"
          vacio="Todavía no hay edificios registrados"
          errorTitulo="No se pudieron leer los edificios"
          contar={() => edificios.contar(orgId)}
          onReintentar={() => setIntento((n) => n + 1)}
        />
      )}
    </ScrollView>
  );
}

function Resumen({
  rotulo,
  vacio,
  errorTitulo,
  contar,
  onReintentar,
}: {
  rotulo: string;
  vacio: string;
  errorTitulo: string;
  /** Se llama una vez por montaje: la `key` del padre decide cuándo se vuelve a contar. */
  contar: () => Promise<number>;
  onReintentar: () => void;
}) {
  const s = useStyles(makeStyles);
  const [conteo, setConteo] = useState<Conteo>({ estado: "cargando" });
  const [contarAlMontar] = useState(() => contar);

  useEffect(() => {
    let vigente = true;
    contarAlMontar()
      .then((total) => {
        if (vigente) setConteo({ estado: "listo", total });
      })
      .catch(() => {
        if (vigente) setConteo({ estado: "error" });
      });
    return () => {
      vigente = false;
    };
  }, [contarAlMontar]);

  if (conteo.estado === "cargando") return <Cargando />;
  if (conteo.estado === "error") {
    return (
      <EmptyState
        title={errorTitulo}
        description="Revisa tu conexión y vuelve a intentarlo."
        action={<Button label="Reintentar" onPress={onReintentar} />}
      />
    );
  }
  if (conteo.total === 0) return <EmptyState title={vacio} />;
  return (
    <Card style={s.resumen}>
      <KeyValueRow label={rotulo} value={String(conteo.total)} strong />
    </Card>
  );
}

function Cargando() {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.cargando} accessibilityLiveRegion="polite">
      <ActivityIndicator color={t.color.text.secondary} />
      <Text style={textStyle(t, "body", t.color.text.secondary)}>Cargando…</Text>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.xl, padding: t.space.xl, maxWidth: 960, width: "100%" },
    resumen: { maxWidth: 360 },
    cargando: { alignItems: "center", justifyContent: "center", gap: t.space.sm, paddingVertical: t.space.xxl },
  });
