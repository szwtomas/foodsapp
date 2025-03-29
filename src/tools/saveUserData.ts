import { z } from "zod";
import { userRepository, UserSchema } from "../repository/userRepository";
import { twoChatMessenger } from "../services/twochat/TwoChatMessenger";

async function saveUserData(
  user: z.infer<typeof UserSchema>
): Promise<string> {
  if (Object.values(user).some(value => value === undefined)) {
    return `Campos faltantes, utiliza la tool requestUserInformation`;
  }
  userRepository.updateUser(user.phoneNumber, user);
  await twoChatMessenger.sendMessage({
      to_number: user.phoneNumber,
      from_number: process.env.TWO_CHAT_PHONE_NUMBER || "",
      text: `Gracias por completar tu perfil.\nTe comentamos como registrar tus comidas de la forma más sencilla!

      Primero, envíame la comida que desees registrar, puedes hacerlo mediante texto, audio o imagen!
      
      Luego validaré la comida y te daré un feedback sobre su calidad.`,
    });
  return `Usuario registrado correctamente`;
}