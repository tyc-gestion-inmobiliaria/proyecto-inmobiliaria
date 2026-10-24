import { useLocalSearchParams } from "expo-router";

import { cuentasBancariasSupabase } from "@/modulos/padron/infraestructura/padron-supabase";
import { PantallaCuenta } from "@/modulos/padron/ui/pantalla-cuenta";

export default function NuevaCuenta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaCuenta cuentas={cuentasBancariasSupabase} edificioId={id} />;
}
