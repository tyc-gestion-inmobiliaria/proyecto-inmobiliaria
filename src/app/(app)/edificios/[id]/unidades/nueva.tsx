import { useLocalSearchParams } from "expo-router";

import { padron } from "@/modulos/padron/infraestructura/padron";
import { PantallaUnidad } from "@/modulos/padron/ui/pantalla-unidad";

export default function NuevaUnidad() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaUnidad padron={padron} edificioId={id} />;
}
