import { edificios } from "@/modules/registry/infrastructure/registry";
import { PantallaEdificio } from "@/modules/registry/ui/building-screen";

export default function NuevoEdificio() {
  return <PantallaEdificio edificios={edificios} />;
}
