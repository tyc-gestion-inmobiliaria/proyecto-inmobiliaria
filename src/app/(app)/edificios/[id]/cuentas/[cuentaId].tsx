import { useLocalSearchParams } from "expo-router";

import { cuentasBancariasSupabase } from "@/modulos/padron/infraestructura/padron-supabase";
import { PantallaCuenta } from "@/modulos/padron/ui/pantalla-cuenta";

export default function EditarCuenta() {
  const { id, cuentaId } = useLocalSearchParams<{ id: string; cuentaId: string }>();
  return <PantallaCuenta cuentas={cuentasBancariasSupabase} edificioId={id} id={cuentaId} />;
}
