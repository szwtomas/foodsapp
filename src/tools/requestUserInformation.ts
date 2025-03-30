import { sendAssistantMessageAndAddToConversation } from "../helper/utility";
import { userRepository, type User } from "../repository/userRepository";
import { twoChatMessenger } from "../services/twochat/TwoChatMessenger";

export async function sendMessageToUser(userPhone: string, message: string) {
  await sendAssistantMessageAndAddToConversation(userPhone, message);
}

function buildInstructionsMessage(user: User): string {
  return "Gracias animal! Me podés ir pasando fotos, audio o texto con el alimento que vayas comiendo :)";
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
  
  return `Gracias por responder!
Para poder ayudarte mejor, *necesito algunos datos más!* Me faltan los siguientes datos:
${translatedFields.map(field => `• ${field}`).join('\n')}

¡Tienen que estar todos!
¿Me los podrías proporcionar? 😊`;
}

export async function executeRequestUserInformationTool({
  user,
}: {
  user: User;
}) {
  const userFromDb = userRepository.getUser(user.phoneNumber);
  if (!userFromDb) {
    return "No se encontró el usuario en la base de datos, NO LLAMAR A MAS TOOLS";
  }

  const missingUserFields = {
    age: userFromDb.age === undefined || userFromDb.age === 0,
    name: userFromDb.name === undefined || userFromDb.name === '',
    goal: userFromDb.goal === undefined || userFromDb.goal.length === 0,
    sex: userFromDb.sex === undefined || userFromDb.sex === '',
    height: userFromDb.height === undefined || userFromDb.height === 0,
    weight: userFromDb.weight === undefined || userFromDb.weight === 0,
    physicalActivityLevel: userFromDb.physicalActivityLevel === undefined || userFromDb.physicalActivityLevel === '',
    dietaryRestrictions: userFromDb.dietaryRestrictions === undefined,
    diseases: userFromDb.diseases === undefined,
  };

  const undefinedFields = Object.entries(missingUserFields)
    .filter(([_, isUndefined]) => isUndefined)
    .map(([fieldName]) => fieldName);

  console.log("undefinedFields", undefinedFields);

  if (undefinedFields.length === 0) {
    return "No hay datos faltantes, NO LLAMAR A MAS TOOLS";
  }

  await sendMessageToUser(user.phoneNumber, buildMissingFieldsText(undefinedFields));
  return "Ya le pedí al usuario los datos faltantes, NO LLAMAR A MAS TOOLS";
}
