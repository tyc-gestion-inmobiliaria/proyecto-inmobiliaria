import { useLocalSearchParams } from "expo-router";

import { padronSupabase } from "@/modulos/padron/infraestructura/padron";
import { PantallaPersonaDeUnidad } from "@/modulos/padron/ui/pantalla-persona-de-unidad";

export default function AgregarPersona() {
  const { id, unidadId } = useLocalSearchParams<{ id: string; unidadId: string }>();
  return <PantallaPersonaDeUnidad padron={padronSupabase} edificioId={id} unidadId={unidadId} />;
}
