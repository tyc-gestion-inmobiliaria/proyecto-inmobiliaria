import { Stack } from "expo-router";

import { temaDelProyecto } from "@/tema";
import { ThemeProvider } from "@/ui";

export default function RootLayout() {
  return (
    <ThemeProvider theme={temaDelProyecto}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
