import { ConEdificio } from "@/compartido/ui/seccion";
import { reservasAdaptador } from "@/modulos/reservas/infraestructura/reservas";
import { PantallaReservas } from "@/modulos/reservas/ui/pantalla-reservas";

export default function Reservas() {
  return <ConEdificio titulo="Reservas">{(id) => <PantallaReservas key={id} reservas={reservasAdaptador} edificioId={id} />}</ConEdificio>;
}
