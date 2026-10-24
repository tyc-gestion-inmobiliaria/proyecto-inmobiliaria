import { ConEdificio } from "@/compartido/ui/seccion";
import { cobranza } from "@/modulos/cobranza/infraestructura/cobranza";
import { PantallaRecorrido } from "@/modulos/campo/ui/pantalla-recorrido";

export default function Lecturas() {
  return <ConEdificio titulo="Lecturas">{(id) => <PantallaRecorrido cobranza={cobranza} edificioId={id} />}</ConEdificio>;
}
