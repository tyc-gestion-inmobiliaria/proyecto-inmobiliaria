import { useLocalSearchParams } from "expo-router";

import { padron } from "@/modulos/padron/infraestructura/padron";
import { PantallaPersonaDeUnidad } from "@/modulos/padron/ui/pantalla-persona-de-unidad";

export default function AgregarPersona() {
  const { id, unidadId } = useLocalSearchParams<{ id: string; unidadId: string }>();
  return <PantallaPersonaDeUnidad padron={padron} edificioId={id} unidadId={unidadId} />;
}
