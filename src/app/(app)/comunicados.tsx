import { ConEdificio } from "@/compartido/ui/seccion";
import { comunicadosAdaptador } from "@/modulos/comunicados/infraestructura/comunicados";
import { PantallaComunicados } from "@/modulos/comunicados/ui/pantalla-comunicados";

export default function Comunicados() {
  return (
    <ConEdificio titulo="Comunicados">{(id) => <PantallaComunicados key={id} comunicados={comunicadosAdaptador} edificioId={id} />}</ConEdificio>
  );
}
