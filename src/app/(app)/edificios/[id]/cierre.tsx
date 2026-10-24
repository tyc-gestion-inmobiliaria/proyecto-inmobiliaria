import { useLocalSearchParams } from "expo-router";

import { cobranza } from "@/modulos/cobranza/infraestructura/cobranza";
import { PantallaCierre } from "@/modulos/cobranza/ui/pantalla-cierre";

export default function Cierre() {
  const { id, paso } = useLocalSearchParams<{ id: string; paso?: string }>();
  return <PantallaCierre cobranza={cobranza} edificioId={id} paso={paso} />;
}
