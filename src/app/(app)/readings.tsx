import { ConEdificio } from "@/shared/ui/section";
import { cobranza } from "@/modules/billing/infrastructure/billing";
import { PantallaRecorrido } from "@/modules/field/ui/rounds-screen";

export default function Lecturas() {
  return <ConEdificio titulo="Lecturas">{(id) => <PantallaRecorrido cobranza={cobranza} edificioId={id} />}</ConEdificio>;
}
