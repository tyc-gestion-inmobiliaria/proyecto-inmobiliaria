import { useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { cobranza } from "@/modules/billing/infrastructure/billing";
import { CuentaDeLaUnidad } from "@/modules/billing/ui/unit-account";
import { useOrganizacion } from "@/modules/organizations/ui/organization";
import { padron } from "@/modules/registry/infrastructure/registry";
import { PantallaUnidad, type PropsDeCuenta } from "@/modules/registry/ui/unit-screen";
import { puedeGestionarPagos } from "@/modules/payments/domain/payment";
import { pagos } from "@/modules/payments/infrastructure/payments";
import { PagosDeLaUnidad } from "@/modules/payments/ui/unit-payments";

// La ruta junta los módulos: el padrón pone la ficha, la cobranza su cuenta y
// los pagos su acción y su pestaña. Registrar un pago vuelve a leer la cuenta.
function Cuenta({ orgId, unidadId, children }: PropsDeCuenta) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { enCurso } = useOrganizacion();
  const [version, setVersion] = useState(0);
  return (
    <CuentaDeLaUnidad cobranza={cobranza} orgId={orgId} unidadId={unidadId} version={version}>
      {(cuenta) => (
        <PagosDeLaUnidad
          pagos={pagos}
          orgId={orgId}
          edificioId={id}
          unidadId={unidadId}
          gestiona={puedeGestionarPagos(enCurso?.rol ?? "")}
          onCambio={() => setVersion((v) => v + 1)}
        >
          {(pagos) => children({ ...cuenta, accion: pagos.accion, pestanas: [...cuenta.pestanas, ...pagos.pestanas] })}
        </PagosDeLaUnidad>
      )}
    </CuentaDeLaUnidad>
  );
}

export default function Unidad() {
  const { id, unitId: unidadId } = useLocalSearchParams<{ id: string; unitId: string }>();
  return <PantallaUnidad padron={padron} edificioId={id} unidadId={unidadId} Cuenta={Cuenta} />;
}
