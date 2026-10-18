import { edificiosSupabase } from "@/modulos/padron/infraestructura/edificios-supabase";
import { PantallaEdificio } from "@/modulos/padron/ui/pantalla-edificio";

export default function NuevoEdificio() {
  return <PantallaEdificio edificios={edificiosSupabase} />;
}
