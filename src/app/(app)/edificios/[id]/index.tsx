import { useLocalSearchParams } from "expo-router";

import { edificios } from "@/modulos/padron/infraestructura/padron";
import { PantallaEdificio } from "@/modulos/padron/ui/pantalla-edificio";

export default function EditarEdificio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaEdificio edificios={edificios} id={id} />;
}
