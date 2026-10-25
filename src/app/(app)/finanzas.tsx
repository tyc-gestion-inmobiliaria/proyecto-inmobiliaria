import { ConEdificio } from "@/compartido/ui/seccion";
import { finanzasAdaptador } from "@/modulos/finanzas/infraestructura/finanzas";
import { PantallaFinanzas } from "@/modulos/finanzas/ui/pantalla-finanzas";

export default function Finanzas() {
  return <ConEdificio titulo="Finanzas">{(id) => <PantallaFinanzas key={id} finanzas={finanzasAdaptador} edificioId={id} />}</ConEdificio>;
}
