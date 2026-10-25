import { ConEdificio } from "@/shared/ui/section";
import { comunicadosAdaptador } from "@/modules/announcements/infrastructure/announcements";
import { PantallaComunicados } from "@/modules/announcements/ui/announcements-screen";

export default function Comunicados() {
  return (
    <ConEdificio titulo="Comunicados">{(id) => <PantallaComunicados key={id} comunicados={comunicadosAdaptador} edificioId={id} />}</ConEdificio>
  );
}
