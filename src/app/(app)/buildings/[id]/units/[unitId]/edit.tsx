import { useLocalSearchParams } from "expo-router";

import { padron } from "@/modules/registry/infrastructure/registry";
import { PantallaUnidad } from "@/modules/registry/ui/unit-screen";

export default function EditarUnidad() {
  const { id, unitId: unidadId } = useLocalSearchParams<{ id: string; unitId: string }>();
  return <PantallaUnidad padron={padron} edificioId={id} unidadId={unidadId} modo="editar" />;
}
