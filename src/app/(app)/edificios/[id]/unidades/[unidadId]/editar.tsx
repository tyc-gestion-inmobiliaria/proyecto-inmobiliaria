import { useLocalSearchParams } from "expo-router";

import { padron } from "@/modulos/padron/infraestructura/padron";
import { PantallaUnidad } from "@/modulos/padron/ui/pantalla-unidad";

export default function EditarUnidad() {
  const { id, unidadId } = useLocalSearchParams<{ id: string; unidadId: string }>();
  return <PantallaUnidad padron={padron} edificioId={id} unidadId={unidadId} modo="editar" />;
}
