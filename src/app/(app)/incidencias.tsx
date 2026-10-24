import { ConEdificio } from "@/compartido/ui/seccion";
import { incidenciasAdaptador } from "@/modulos/incidencias/infraestructura/incidencias";
import { PantallaIncidencias } from "@/modulos/incidencias/ui/pantalla-incidencias";

export default function Incidencias() {
  return (
    <ConEdificio titulo="Incidencias">
      {(id) => <PantallaIncidencias key={id} incidencias={incidenciasAdaptador} edificioId={id} />}
    </ConEdificio>
  );
}
