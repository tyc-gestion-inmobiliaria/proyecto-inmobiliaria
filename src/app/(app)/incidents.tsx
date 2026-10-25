import { ConEdificio } from "@/shared/ui/section";
import { incidenciasAdaptador } from "@/modules/incidents/infrastructure/incidents";
import { PantallaIncidencias } from "@/modules/incidents/ui/incidents-screen";

export default function Incidencias() {
  return (
    <ConEdificio titulo="Incidencias">
      {(id) => <PantallaIncidencias key={id} incidencias={incidenciasAdaptador} edificioId={id} />}
    </ConEdificio>
  );
}
