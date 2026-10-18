import { edificiosSupabase } from "@/modulos/padron/infraestructura/edificios-supabase";
import { PantallaEdificios } from "@/modulos/padron/ui/pantalla-edificios";

export default function Edificios() {
  return <PantallaEdificios edificios={edificiosSupabase} />;
}
