import { ConEdificio } from "@/shared/ui/section";
import { incidenciasAdaptador } from "@/modules/incidents/infrastructure/incidents";
import { PantallaIncidencias } from "@/modules/incidents/ui/incidents-screen";
import { residente } from "@/modules/resident/infrastructure/resident";
import { ConMisUnidades } from "@/modules/resident/ui/with-my-units";

// La ruta junta los módulos: el residente ve y registra las de sus unidades; el equipo, todo.
export default function Incidencias() {
  return (
    <ConEdificio titulo="Incidencias">
      {(id) => (
        <ConMisUnidades key={id} residente={residente} edificioId={id}>
          {(propias) => <PantallaIncidencias incidencias={incidenciasAdaptador} edificioId={id} propias={propias} />}
        </ConMisUnidades>
      )}
    </ConEdificio>
  );
}
