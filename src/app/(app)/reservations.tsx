import { ConEdificio } from "@/shared/ui/section";
import { reservasAdaptador } from "@/modules/reservations/infrastructure/reservations";
import { PantallaReservas } from "@/modules/reservations/ui/reservations-screen";

export default function Reservas() {
  return <ConEdificio titulo="Reservas">{(id) => <PantallaReservas key={id} reservas={reservasAdaptador} edificioId={id} />}</ConEdificio>;
}
