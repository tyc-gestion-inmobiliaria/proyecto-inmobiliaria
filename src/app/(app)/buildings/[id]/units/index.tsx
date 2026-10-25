import { useLocalSearchParams } from "expo-router";

import { padron } from "@/modules/registry/infrastructure/registry";
import { PantallaUnidades } from "@/modules/registry/ui/units-screen";

export default function Unidades() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaUnidades padron={padron} edificioId={id} />;
}
