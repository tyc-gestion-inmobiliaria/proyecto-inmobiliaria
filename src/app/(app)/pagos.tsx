import { pagosSupabase } from "@/modulos/pagos/infraestructura/pagos-supabase";
import { PantallaPagos } from "@/modulos/pagos/ui/pantalla-pagos";

export default function Pagos() {
  return <PantallaPagos pagos={pagosSupabase} />;
}
