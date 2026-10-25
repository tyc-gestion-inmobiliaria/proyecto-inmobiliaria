import { useLocalSearchParams } from "expo-router";

import { padron } from "@/modules/registry/infrastructure/registry";
import { PantallaUnidad } from "@/modules/registry/ui/unit-screen";

export default function NuevaUnidad() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaUnidad padron={padron} edificioId={id} />;
}
