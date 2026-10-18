import { PantallaInicio } from "@/modulos/cartera/ui/pantalla-inicio";
import { edificiosSupabase } from "@/modulos/padron/infraestructura/edificios-supabase";

export default function Inicio() {
  return <PantallaInicio edificios={edificiosSupabase} />;
}
