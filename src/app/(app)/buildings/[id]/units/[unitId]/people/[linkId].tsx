import { useLocalSearchParams } from "expo-router";

import { padron } from "@/modules/registry/infrastructure/registry";
import { PantallaPersonaDeUnidad } from "@/modules/registry/ui/unit-person-screen";

export default function EditarPersona() {
  const { id, unitId: unidadId, linkId: vinculoId } = useLocalSearchParams<{ id: string; unitId: string; linkId: string }>();
  return <PantallaPersonaDeUnidad padron={padron} edificioId={id} unidadId={unidadId} vinculoId={vinculoId} />;
}
