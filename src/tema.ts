/**
 * El tema de este proyecto.
 *
 * Es el único sitio que se toca para darle la cara de un cliente: el color de
 * marca, el radio, la fuente. Lo que no se escribe acá se hereda del tema
 * neutro de la plantilla (`src/ui/tokens.ts`).
 */
import { crearTema } from "./ui/theme/create-theme";

export const temaDelProyecto = crearTema({
  name: "proyecto",
  // color: { accent: { base: "#0b6e4f", hover: "#095a41", pressed: "#074833", subtle: "#e4f3ec", text: "#095a41" } },
  // radius: { sm: 2, md: 4, lg: 8 },
});
