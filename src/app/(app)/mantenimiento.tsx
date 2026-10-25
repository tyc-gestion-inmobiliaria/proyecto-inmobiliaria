import { ConEdificio } from "@/compartido/ui/seccion";
import { mantenimientoAdaptador } from "@/modulos/mantenimiento/infraestructura/mantenimiento";
import { PantallaMantenimiento } from "@/modulos/mantenimiento/ui/pantalla-mantenimiento";

export default function Mantenimiento() {
  return (
    <ConEdificio titulo="Mantenimiento">
      {(id) => <PantallaMantenimiento key={id} mantenimiento={mantenimientoAdaptador} edificioId={id} />}
    </ConEdificio>
  );
}
