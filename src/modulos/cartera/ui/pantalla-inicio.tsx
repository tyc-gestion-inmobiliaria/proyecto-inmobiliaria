/**
 * Lo que se ve al entrar. Por ahora dice solo lo que la base sabe: a qué
 * administradora pertenece la persona y si ya tiene edificios. La tabla de la
 * cartera llega con PB-11.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { useOrganizacion } from "@/modulos/organizaciones/ui/organizacion";
import type { EdificiosPuerto } from "@/modulos/padron/aplicacion/puertos";
import { Button, Card, EmptyState, KeyValueRow, ScreenTitle, textStyle, useStyles, useTheme, type Tema } from "@/ui";

type Conteo = { estado: "cargando" } | { estado: "error" } | { estado: "listo"; total: number };

export function PantallaInicio({ edificios }: { edificios: EdificiosPuerto }) {
  const s = useStyles(makeStyles);
  const { carga, enCurso, reintentar } = useOrganizacion();
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

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <ScreenTitle>{enCurso.orgNombre}</ScreenTitle>
      {/* La clave reinicia el conteo al cambiar de administradora o al reintentar. */}
      <ResumenEdificios
        key={`${enCurso.orgId}-${intento}`}
        orgId={enCurso.orgId}
        edificios={edificios}
        onReintentar={() => setIntento((n) => n + 1)}
      />
    </ScrollView>
  );
}

function ResumenEdificios({
  orgId,
  edificios,
  onReintentar,
}: {
  orgId: string;
  edificios: EdificiosPuerto;
  onReintentar: () => void;
}) {
  const s = useStyles(makeStyles);
  const [conteo, setConteo] = useState<Conteo>({ estado: "cargando" });

  useEffect(() => {
    let vigente = true;
    edificios
      .contar(orgId)
      .then((total) => {
        if (vigente) setConteo({ estado: "listo", total });
      })
      .catch(() => {
        if (vigente) setConteo({ estado: "error" });
      });
    return () => {
      vigente = false;
    };
  }, [edificios, orgId]);

  if (conteo.estado === "cargando") return <Cargando />;
  if (conteo.estado === "error") {
    return (
      <EmptyState
        title="No se pudieron leer los edificios"
        description="Revisa tu conexión y vuelve a intentarlo."
        action={<Button label="Reintentar" onPress={onReintentar} />}
      />
    );
  }
  if (conteo.total === 0) return <EmptyState title="Todavía no hay edificios registrados" />;
  return (
    <Card style={s.resumen}>
      <KeyValueRow label="Edificios registrados" value={String(conteo.total)} strong />
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
