import type { User } from "../repository/userRepository";
import { twoChatMessenger } from "../services/twochat/TwoChatMessenger";

export async function sendMessageToUser(userPhone: string, message: string) {
  await twoChatMessenger.sendMessage({
    to_number: userPhone,
    from_number: process.env.TWO_CHAT_PHONE_NUMBER || "",
    text: message,
  });
  console.log(
    `Sent message ${message} to ${userPhone} from ${process.env.TWO_CHAT_PHONE_NUMBER}`
  );
}

function buildInstructionsMessage(user: User): string {
  return "Gracias animal! Me podés ir pasando fotos, audio o texto con la comida que vayas comiendo :)";
}

function buildMissingFieldsText(missingFields: string[]): string {
  const fieldTranslations: { [key: string]: string } = {
    age: "edad",
    name: "nombre",
    goal: "objetivo",
    sex: "sexo",
    height: "altura",
    weight: "peso",
    physicalActivityLevel: "nivel de actividad física",
    dietaryRestrictions: "restricciones alimentarias",
    diseases: "enfermedades"
  };

  const translatedFields = missingFields.map(field => fieldTranslations[field]);
  
  return `¡Hola! Para poder ayudarte mejor, necesito algunos datos más: ${translatedFields.join(
    ", "
  )}. ¿Me los podrías proporcionar? 😊`;
}

export async function executeRequestUserInformationTool({
  user,
}: {
  user: User;
}) {
  const missingUserFields = {
    age: user.age === undefined,
    name: user.name === undefined,
    goal: user.goal === undefined,
    sex: user.sex === undefined,
    height: user.height === undefined,
    weight: user.weight === undefined,
    physicalActivityLevel: user.physicalActivityLevel === undefined,
    dietaryRestrictions: user.dietaryRestrictions === undefined,
    diseases: user.diseases === undefined,
  };

  const undefinedFields = Object.entries(missingUserFields)
    .filter(([_, isUndefined]) => isUndefined)
    .map(([fieldName]) => fieldName);

  if (undefinedFields.length === 0) {
    await sendMessageToUser(user.phoneNumber, buildInstructionsMessage(user));
    return "Ya pedí todos los datos y mandé la información de instrucciones, NO LLAMAR A MAS TOOLS";
  }

  await sendMessageToUser(user.phoneNumber, buildMissingFieldsText(undefinedFields));
  return "Ya le pedí al usuario los datos faltantes, NO LLAMAR A MAS TOOLS";
}
