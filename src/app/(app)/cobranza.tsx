import { useLocalSearchParams } from "expo-router";

import { ConEdificio } from "@/compartido/ui/seccion";
import { cobranza } from "@/modulos/cobranza/infraestructura/cobranza";
import { PantallaCierre } from "@/modulos/cobranza/ui/pantalla-cierre";

export default function Cobranza() {
  const { paso } = useLocalSearchParams<{ paso?: string }>();
  return <ConEdificio titulo="Cobranza">{(id) => <PantallaCierre cobranza={cobranza} edificioId={id} paso={paso} />}</ConEdificio>;
}
