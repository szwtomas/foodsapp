import type { z } from "zod";
import { userRepository, type UserSchema } from "../repository/userRepository";
import { twoChatMessenger } from "../services/twochat/TwoChatMessenger";

export async function saveUserData(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  user: any
): Promise<string> {
  const receivedUser = user.user;
  console.log("inside saveUserData, received user", receivedUser);
  if (Object.values(receivedUser).some(value => value === undefined)) {
    await twoChatMessenger.sendMessage({
      to_number: receivedUser.phoneNumber,
      from_number: process.env.TWO_CHAT_PHONE_NUMBER || "",
      text: "Falta algun dato, manda todos por favor!",
    });
    return "Campos faltantes, utiliza la tool requestUserInformation";
  }

  userRepository.updateUser(receivedUser.phoneNumber, receivedUser);

  console.log(`actualice el user, ahora voy a mandar a ${receivedUser.phoneNumber} el mensaje de bienvenida`);
  await twoChatMessenger.sendMessage({
      to_number: receivedUser.phoneNumber,
      from_number: process.env.TWO_CHAT_PHONE_NUMBER || "",
      text: `¡Gracias por completar tu perfil! 🙂
Te comentamos como registrar tus comidas de la forma más sencilla!
Primero, envíame la comida que desees registrar, puedes hacerlo mediante texto, audio o imagen!
Luego validaré la comida y te daré un feedback sobre su calidad, ademas de darte resumen o reporte si me los pides!
¡A comer rico rico! Pero sanito 🥑`});


  return "Usuario registrado correctamente, NO LLAMAR A MAS TOOLS";
}