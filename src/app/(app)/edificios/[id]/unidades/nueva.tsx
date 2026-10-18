import { useLocalSearchParams } from "expo-router";

import { padronSupabase } from "@/modulos/padron/infraestructura/padron";
import { PantallaUnidad } from "@/modulos/padron/ui/pantalla-unidad";

export default function NuevaUnidad() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaUnidad padron={padronSupabase} edificioId={id} />;
}
