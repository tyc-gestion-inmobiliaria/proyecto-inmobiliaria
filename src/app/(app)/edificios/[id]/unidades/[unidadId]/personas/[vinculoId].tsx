import { useLocalSearchParams } from "expo-router";

import { padron } from "@/modulos/padron/infraestructura/padron";
import { PantallaPersonaDeUnidad } from "@/modulos/padron/ui/pantalla-persona-de-unidad";

export default function EditarPersona() {
  const { id, unidadId, vinculoId } = useLocalSearchParams<{ id: string; unidadId: string; vinculoId: string }>();
  return <PantallaPersonaDeUnidad padron={padron} edificioId={id} unidadId={unidadId} vinculoId={vinculoId} />;
}
