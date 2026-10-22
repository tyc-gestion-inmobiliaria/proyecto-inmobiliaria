import { useLocalSearchParams } from "expo-router";

import { cobranzaSupabase } from "@/modulos/cobranza/infraestructura/cobranza-supabase";
import { PantallaCierre } from "@/modulos/cobranza/ui/pantalla-cierre";

export default function Cierre() {
  const { id, paso } = useLocalSearchParams<{ id: string; paso?: string }>();
  return <PantallaCierre cobranza={cobranzaSupabase} edificioId={id} paso={paso} />;
}
