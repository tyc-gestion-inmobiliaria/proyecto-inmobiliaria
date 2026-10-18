import { useLocalSearchParams } from "expo-router";

import { padronSupabase } from "@/modulos/padron/infraestructura/padron";
import { PantallaPersonaDeUnidad } from "@/modulos/padron/ui/pantalla-persona-de-unidad";

export default function EditarPersona() {
  const { id, unidadId, vinculoId } = useLocalSearchParams<{ id: string; unidadId: string; vinculoId: string }>();
  return <PantallaPersonaDeUnidad padron={padronSupabase} edificioId={id} unidadId={unidadId} vinculoId={vinculoId} />;
}
