import { useLocalSearchParams } from "expo-router";

import { edificios } from "@/modules/registry/infrastructure/registry";
import { PantallaEdificio } from "@/modules/registry/ui/building-screen";

export default function EditarEdificio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaEdificio edificios={edificios} id={id} />;
}
