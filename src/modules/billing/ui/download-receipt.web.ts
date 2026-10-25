/**
 * El recibo en PDF, en la web: se abre en una ventana propia y se lanza la
 * impresión, donde el navegador ofrece "Guardar como PDF". Así sale solo el
 * recibo, sin el menú de la app.
 */
export async function descargarRecibo(html: string, nombre: string): Promise<boolean> {
  const ventana = window.open("", "_blank");
  if (!ventana) return false;
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
  ventana.document.title = nombre;
  ventana.focus();
  // Espera a que pinte antes de imprimir.
  setTimeout(() => ventana.print(), 250);
  return true;
}
