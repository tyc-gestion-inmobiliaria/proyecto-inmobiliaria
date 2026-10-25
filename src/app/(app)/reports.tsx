import { reportesAdaptador } from "@/modules/reports/infrastructure/reports";
import { PantallaReportes } from "@/modules/reports/ui/reports-screen";

export default function Reportes() {
  return <PantallaReportes reportes={reportesAdaptador} />;
}
