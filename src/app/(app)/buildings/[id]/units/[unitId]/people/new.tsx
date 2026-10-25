import { useLocalSearchParams } from "expo-router";

import { padron } from "@/modules/registry/infrastructure/registry";
import { PantallaPersonaDeUnidad } from "@/modules/registry/ui/unit-person-screen";

export default function AgregarPersona() {
  const { id, unitId: unidadId } = useLocalSearchParams<{ id: string; unitId: string }>();
  return <PantallaPersonaDeUnidad padron={padron} edificioId={id} unidadId={unidadId} />;
}
