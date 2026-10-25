import { useLocalSearchParams } from "expo-router";

import { padron } from "@/modulos/padron/infraestructura/padron";
import { PantallaUnidades } from "@/modulos/padron/ui/pantalla-unidades";

export default function Unidades() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaUnidades padron={padron} edificioId={id} />;
}
