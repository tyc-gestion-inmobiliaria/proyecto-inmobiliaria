import { ConEdificio } from "@/shared/ui/section";
import { mantenimientoAdaptador } from "@/modules/maintenance/infrastructure/maintenance";
import { PantallaMantenimiento } from "@/modules/maintenance/ui/maintenance-screen";

export default function Mantenimiento() {
  return (
    <ConEdificio titulo="Mantenimiento">
      {(id) => <PantallaMantenimiento key={id} mantenimiento={mantenimientoAdaptador} edificioId={id} />}
    </ConEdificio>
  );
}
