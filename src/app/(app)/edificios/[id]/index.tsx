import { useLocalSearchParams } from "expo-router";

import { edificiosSupabase } from "@/modulos/padron/infraestructura/edificios-supabase";
import { PantallaEdificio } from "@/modulos/padron/ui/pantalla-edificio";

export default function EditarEdificio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaEdificio edificios={edificiosSupabase} id={id} />;
}
