/**
 * El CSV en la web: se baja como archivo. Lleva la marca UTF-8 al principio
 * para que la hoja de cálculo lea bien las tildes.
 */
export async function descargarCsv(csv: string, nombre: string): Promise<boolean> {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `${nombre}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
