/**
 * Dónde guarda la sesión el teléfono: el almacén clave-valor de expo-sqlite.
 *
 * No va en expo-secure-store porque la sesión de Supabase pasa los 2 KB que
 * acepta el llavero de iOS. La web usa `almacen-sesion.web.ts`.
 */
import Storage from "expo-sqlite/kv-store";

import type { AlmacenSesion } from "./types";

export const almacenSesion: AlmacenSesion | undefined = Storage;
