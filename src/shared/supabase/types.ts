/** Lo que supabase-js necesita para guardar la sesión. */
export interface AlmacenSesion {
  getItem: (clave: string) => string | null | Promise<string | null>;
  setItem: (clave: string, valor: string) => void | Promise<void>;
  removeItem: (clave: string) => void | Promise<void>;
}
