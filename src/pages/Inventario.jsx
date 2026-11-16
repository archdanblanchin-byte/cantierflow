import { useState } from "react";
import { usePermessi } from "@/hooks/usePermessi";
import MagazzinoConsultazione from "@/components/inventario/MagazzinoConsultazione";
import InventarioGestione from "@/components/inventario/InventarioGestione";

export default function Inventario() {
  const { isAdmin, gestoreInventario } = usePermessi();
  const puoGestire = isAdmin || gestoreInventario;
  const [vistaGestione, setVistaGestione] = useState(false);

  if (vistaGestione && puoGestire) {
    return <InventarioGestione onChiudi={() => setVistaGestione(false)} />;
  }

  return (
    <MagazzinoConsultazione
      puoGestire={puoGestire}
      onApriGestione={() => setVistaGestione(true)}
    />
  );
}