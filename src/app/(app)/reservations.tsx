import { ConEdificio } from "@/shared/ui/section";
import { reservasAdaptador } from "@/modules/reservations/infrastructure/reservations";
import { PantallaReservas } from "@/modules/reservations/ui/reservations-screen";
import { residente } from "@/modules/resident/infrastructure/resident";
import { ConMisUnidades } from "@/modules/resident/ui/with-my-units";

// La ruta junta los módulos: el residente ve y reserva para sus unidades; el equipo, todo.
export default function Reservas() {
  return (
    <ConEdificio titulo="Reservas">
      {(id) => (
        <ConMisUnidades key={id} residente={residente} edificioId={id}>
          {(propias) => <PantallaReservas reservas={reservasAdaptador} edificioId={id} propias={propias} />}
        </ConMisUnidades>
      )}
    </ConEdificio>
  );
}
