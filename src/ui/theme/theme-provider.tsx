/**
 * El tema en curso, para todo el árbol.
 *
 * Sin proveedor el kit usa el tema claro neutro, así que un componente suelto
 * —en una prueba, en una historia de Storybook— se ve bien igual.
 */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

import { lightTheme, type Tema } from "../tokens";
import { installFocusVisible } from "./focus-visible";

const ThemeContext = createContext<Tema>(lightTheme);

export function ThemeProvider({ theme, children }: { theme: Tema; children: ReactNode }) {
  // El anillo de foco del teclado es una regla de CSS global en web: se
  // reescribe cuando cambia el tema para que tome sus colores.
  useEffect(() => {
    installFocusVisible(theme);
  }, [theme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Tema {
  return useContext(ThemeContext);
}

/**
 * Los estilos de un componente, hechos con el tema en curso.
 *
 * `factory` tiene que vivir fuera del componente (a nivel de módulo): es la
 * llave del `useMemo`, y una función nueva en cada render rehace los estilos
 * en cada render.
 */
export function useStyles<T>(factory: (theme: Tema) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
