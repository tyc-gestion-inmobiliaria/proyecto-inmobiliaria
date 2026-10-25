import { ConEdificio } from "@/shared/ui/section";
import { comunicadosAdaptador } from "@/modules/announcements/infrastructure/announcements";
import { PantallaComunicados } from "@/modules/announcements/ui/announcements-screen";
import { useOrganizacion } from "@/modules/organizations/ui/organization";

// El residente lee lo publicado; redactar es del equipo.
export default function Comunicados() {
  const { enCurso } = useOrganizacion();
  return (
    <ConEdificio titulo="Comunicados">
      {(id) => <PantallaComunicados key={id} comunicados={comunicadosAdaptador} edificioId={id} soloLectura={enCurso?.rol === "residente"} />}
    </ConEdificio>
  );
}
