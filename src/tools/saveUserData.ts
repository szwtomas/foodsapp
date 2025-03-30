import type { z } from "zod";
import { CompleteUserSchema, type User, userRepository, type UserSchema } from "../repository/userRepository";
import { sendAssistantMessageAndAddToConversation } from "../helper/utility";
import { userExpectedDailyCaloriesRepository } from "../repository/userExpectedDailyCaloriesRepository";

export async function saveUserData(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  user: any
): Promise<string> {
  const receivedUser = user.user;

  const updatedUser = userRepository.updateUser(receivedUser.phoneNumber, receivedUser);

  if (isCompleteUser(updatedUser)) {
    console.log(`actualice el user, ahora voy a mandar a ${receivedUser.phoneNumber} el mensaje de bienvenida`);

    await sendAssistantMessageAndAddToConversation(receivedUser.phoneNumber, 
      `¡Gracias por completar tu perfil 🙂!

    Te comentamos *cómo registrar tus alimentos* de la forma más sencilla!

    Primero, envíame el alimento que desees registrar, puedes hacerlo mediante texto, audio o imagen!

    Luego validaré el alimento y te daré un feedback sobre su calidad, ademas de darte resumen o reporte si me los pides!
    
    ¡A comer rico! Pero sanito 🥑`);

    userExpectedDailyCaloriesRepository.addEntry(receivedUser.phoneNumber);

    return "Usuario registrado correctamente, NO LLAMAR A MAS TOOLS, específicamente NO llamar a requestUserInformation.";
  }

  console.log("faltan campos, voy a llamar a requestUserInformation");
  return "Campos faltantes, utiliza la tool requestUserInformation";
}

function isCompleteUser(user?: User): boolean {
  return CompleteUserSchema.safeParse(user).success;
}