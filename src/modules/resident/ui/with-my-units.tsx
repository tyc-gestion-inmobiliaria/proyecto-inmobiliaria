/**
 * Para las secciones que comparten el equipo y el residente (reservas,
 * incidencias, comunicados): si quien mira es residente, lee sus unidades del
 * edificio y se las pasa a la pantalla, que recorta lo que muestra y lo que
 * deja hacer. Para el equipo, `undefined`: ve y gestiona todo.
 *
 * La ruta lo compone con la pantalla de cada sección; la RLS es la que de
 * verdad impide ver lo ajeno cuando esas secciones tengan tablas.
 */
import { useCallback, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Cargando } from "@/modules/organizations/ui/with-organization";
import { useOrganizacion } from "@/modules/organizations/ui/organization";
import { useCarga } from "@/shared/ui/use-load";
import { ANCHO_DE_PANTALLA } from "@/shared/ui/layout";
import { Button, EmptyState, useStyles, type Tema } from "@/ui";

import type { ResidentePuerto } from "../application/ports";

export interface UnidadDelResidente {
  id: string;
  numero: string;
}

export function ConMisUnidades({
  residente,
  edificioId,
  children,
}: {
  residente: ResidentePuerto;
  edificioId: string;
  children: (propias: UnidadDelResidente[] | undefined) => ReactNode;
}) {
  const { enCurso } = useOrganizacion();
  if (enCurso?.rol !== "residente") return <>{children(undefined)}</>;
  return (
    <DelResidente residente={residente} orgId={enCurso.orgId} edificioId={edificioId}>
      {children}
    </DelResidente>
  );
}

function DelResidente({
  residente,
  orgId,
  edificioId,
  children,
}: {
  residente: ResidentePuerto;
  orgId: string;
  edificioId: string;
  children: (propias: UnidadDelResidente[]) => ReactNode;
}) {
  const s = useStyles(makeStyles);
  const leer = useCallback(() => residente.misUnidades(orgId), [residente, orgId]);
  const { carga, reintentar } = useCarga(leer);
  if (carga.estado === "cargando") return <Cargando />;
  if (carga.estado === "error") {
    return (
      <View style={s.pantalla}>
        <EmptyState
          title="No se pudieron leer tus unidades"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      </View>
    );
  }
  return <>{children(carga.valor.filter((u) => u.edificioId === edificioId).map((u) => ({ id: u.id, numero: u.numero })))}</>;
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, padding: t.space.xl, maxWidth: ANCHO_DE_PANTALLA, width: "100%" },
  });
