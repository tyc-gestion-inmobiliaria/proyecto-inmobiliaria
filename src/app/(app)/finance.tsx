import { ConEdificio } from "@/shared/ui/section";
import { finanzasAdaptador } from "@/modules/finance/infrastructure/finance";
import { PantallaFinanzas } from "@/modules/finance/ui/finance-screen";

export default function Finanzas() {
  return <ConEdificio titulo="Finanzas">{(id) => <PantallaFinanzas key={id} finanzas={finanzasAdaptador} edificioId={id} />}</ConEdificio>;
}
