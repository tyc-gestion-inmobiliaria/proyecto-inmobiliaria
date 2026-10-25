import { padron } from "@/modules/registry/infrastructure/registry";
import { PantallaEdificios } from "@/modules/registry/ui/buildings-screen";

export default function Edificios() {
  return <PantallaEdificios padron={padron} />;
}
