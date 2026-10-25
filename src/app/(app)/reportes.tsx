import { reportesAdaptador } from "@/modulos/reportes/infraestructura/reportes";
import { PantallaReportes } from "@/modulos/reportes/ui/pantalla-reportes";

export default function Reportes() {
  return <PantallaReportes reportes={reportesAdaptador} />;
}
