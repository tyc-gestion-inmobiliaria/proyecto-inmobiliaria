import { useLocalSearchParams } from "expo-router";

import { padronSupabase } from "@/modulos/padron/infraestructura/padron";
import { PantallaUnidades } from "@/modulos/padron/ui/pantalla-unidades";

export default function Unidades() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaUnidades padron={padronSupabase} edificioId={id} />;
}
