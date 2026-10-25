/**
 * Inicio de sesión con correo y contraseña (PB-05).
 *
 * - El error va junto al campo que hay que corregir, con texto; el de la red
 *   o de configuración va arriba del botón, porque no es de ningún campo.
 * - Con credenciales malas el mensaje es el mismo exista o no el correo.
 * - Enter en la contraseña envía el formulario.
 * - "¿Olvidaste tu contraseña?" lleva a pedir el correo de recuperación. Si
 *   la persona vuelve de un enlace vencido, el aviso aparece acá.
 * - Los campos se declaran para el gestor de contraseñas (correo y clave
 *   actual): entrar no depende de recordar ni teclear la clave.
 * - En la maqueta, tres botones entran directo con una cuenta de cada rol:
 *   probar la demo no pide inventar un correo.
 */
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { EN_MAQUETA } from "@/shared/mock/mode";
import { Button, TextField, textStyle, useStyles, useTheme, type IconName, type Tema } from "@/ui";

import type { ErroresCredenciales } from "../domain/credentials";
import { useSesion } from "./session";
import { AvisoGeneral, TarjetaDeAcceso } from "./access-card";

/** Las cuentas de la demo: el rol sale del correo (ver `infraestructura/sesion.ts`). */
const CUENTAS_DE_DEMO: readonly { correo: string; rol: string; icono: IconName }[] = [
  { correo: "admin@demo.test", rol: "administración", icono: "building" },
  { correo: "personal@demo.test", rol: "personal del edificio", icono: "droplet" },
  { correo: "residente@demo.test", rol: "residente", icono: "home" },
];
const CLAVE_DE_DEMO = "demo-1234";

export function PantallaEntrar() {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { entrar, avisoDeEnlace } = useSesion();

  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [errores, setErrores] = useState<ErroresCredenciales>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);

  async function enviar(credenciales = { correo, contrasena }, quien = "formulario") {
    if (enviando) return;
    setEnviando(quien);
    setErrorGeneral(null);
    const r = await entrar(credenciales);
    setEnviando(null);
    // Con éxito el layout cambia de rama solo: no hace falta navegar desde acá.
    if (r.ok) return;
    setErrores(r.campos);
    setErrorGeneral(r.general ?? null);
  }

  const aviso = errorGeneral ?? avisoDeEnlace;

  return (
    <TarjetaDeAcceso titulo="Inicia sesión">
      <View style={s.campos}>
        <TextField
          label="Correo"
          value={correo}
          onChangeText={(v) => {
            setCorreo(v);
            if (errores.correo) setErrores((e) => ({ ...e, correo: undefined }));
          }}
          placeholder="nombre@empresa.pe"
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          autoFocus
          required
          error={errores.correo}
          testID="entrar-correo"
        />
        <TextField
          label="Contraseña"
          value={contrasena}
          onChangeText={(v) => {
            setContrasena(v);
            if (errores.contrasena) setErrores((e) => ({ ...e, contrasena: undefined }));
          }}
          secureTextEntry
          revelable
          autoComplete="current-password"
          autoCapitalize="none"
          required
          error={errores.contrasena}
          onSubmitEditing={() => enviar()}
          testID="entrar-contrasena"
        />
      </View>
      {aviso ? <AvisoGeneral>{aviso}</AvisoGeneral> : null}
      <Button label="Entrar" onPress={() => enviar()} loading={enviando === "formulario"} full size="lg" testID="entrar-enviar" />
      <Button
        label="¿Olvidaste tu contraseña?"
        variant="ghost"
        full
        onPress={() => router.push("/forgot-password")}
        testID="entrar-recuperar"
      />
      {EN_MAQUETA ? (
        <View style={s.demo}>
          <View style={s.linea} />
          <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>O entra a la demo con un rol, sin escribir nada:</Text>
          {CUENTAS_DE_DEMO.map((c) => (
            <Button
              key={c.correo}
              variant="secondary"
              icon={c.icono}
              label={`Entrar como ${c.rol}`}
              full
              loading={enviando === c.correo}
              disabled={enviando !== null && enviando !== c.correo}
              onPress={() => {
                setCorreo(c.correo);
                setContrasena(CLAVE_DE_DEMO);
                void enviar({ correo: c.correo, contrasena: CLAVE_DE_DEMO }, c.correo);
              }}
              testID={`entrar-demo-${c.correo.split("@")[0]}`}
            />
          ))}
        </View>
      ) : null}
    </TarjetaDeAcceso>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    campos: { gap: t.space.lg },
    demo: { gap: t.space.sm },
    linea: { height: 1, backgroundColor: t.color.border.default, marginBottom: t.space.sm },
  });
