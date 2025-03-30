import type { Request, Response } from "express";
import { logger } from "../logger";
import { twoChatMessenger } from "../services/twochat/TwoChatMessenger";
import type { StandardizedWebhookPayload } from "../services/types/TwoChatTypes";
import {
  type Message,
  type User,
  userRepository,
  UserSchema,
} from "../repository/userRepository";
import { generateText, tool } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { executeRequestUserInformationTool } from "../tools/requestUserInformation";
import { validateFoodLogEntry } from "../tools/validateFoodLogEntry";

export async function receiveWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    console.log("received webhook");
    const { body } = req;

    console.log("body is", body);
    // Process the webhook payload
    const payload = await twoChatMessenger.processWebhookPayload(body);

    // Check if it's a message read event
    if ("event" in payload && payload.event === "message.read") {
      logger.info({ payload }, "Message read event");
      res.status(200).send({ message: "Message read event processed" });
      return;
    }

    // Cast to StandardizedWebhookPayload and extract relevant data
    const standardizedPayload = payload as StandardizedWebhookPayload;
    const userPhoneNumber = standardizedPayload.from;
    const fromNumber = process.env.TWO_CHAT_PHONE_NUMBER || "";

    logger.info(
      {
        from: userPhoneNumber,
        messageType: standardizedPayload.type,
        messageId: standardizedPayload.messageId,
      },
      "Received message"
    );

    await handleMessage(standardizedPayload, userPhoneNumber);
    res.status(200).send({ message: "Webhook processed successfully" });
  } catch (error) {
    logger.error(error, "Error processing webhook");
    res
      .status(500)
      .send({ message: "An error occurred while processing webhook" });
  }
}

// this is the main app workflow
async function handleMessage(
  payload: StandardizedWebhookPayload,
  fromNumber: string
) {
  let user = userRepository.getUser(fromNumber);

  console.log("user is", user);
  if (!user) {
    user = userRepository.createUserFromNumber(fromNumber);
  }
  userRepository.addMessage(user.phoneNumber, {
    content: { text: payload.content.text, media: payload.content.media },
    sender: "user",
  });

  let lastConversationMessages: Message[] = [];
  if (user?.conversation?.length) {
    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
    lastConversationMessages = user.conversation.filter(
      (msg) => msg.timestamp > last5Minutes
    );
  }

  const { text: result, steps } = await generateText({
    model: openai("o3-mini", { structuredOutputs: true }),
    tools: {
      requestUserInformation: tool({
        description:
          "Solicita información al usuario para completar su perfil.",
        parameters: z.object({
          user: z
            .object({
              phoneNumber: z.string(),
            })
            .describe(
              "El perfil del usuario, los datos están como opcionales porque el objetivo de esta tool es pedirle al usuario que complete la información que le falte."
            ),
        }),
        execute: executeRequestUserInformationTool,
      }),
      validateFoodLogEntry: tool({
        description: "Analiza los mensajes del usuario para identificar y registrar una comida.",
        parameters: z.object({
          userPhone: z.string().describe("El número de teléfono del usuario"),
          conversationContext: z.array(z.custom<Message>())
        }),
        execute: async ({ userPhone, conversationContext }) => {
          const user = userRepository.getUser(userPhone);
          if (!user || !user.conversation) {
            return "No se encontró el usuario o no tiene conversación.";
          }
          
          // Use the last few messages as context
          const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
          const recentMessages = user.conversation.filter(msg => msg.timestamp > last5Minutes);
          
          return await validateFoodLogEntry(userPhone, recentMessages);
        }
      })
    },
    prompt: lastConversationMessages.map(msg => `${msg.content.text}\n${msg.content.media?.url || ""}`).join("\n"),
    system: systemPrompt(user, lastConversationMessages),
  });
  console.log(
    "stepsTaken: ",
    steps.flatMap((step) => step.toolCalls)
  );
}

const systemPrompt = (
  user?: User,
  last5MinutesConversation?: Message[]
): string => `
  Sos Nutrito, un asistente nutricional mediante WhatsApp 
  especializado en:
  1. Registrar los alimentos que consume el usuario con sus valores nutricionales, tanto calorías, como macronutrientes y micronutrientes.
  2. Aconsejar y proponer mejoras de dieta a los usuarios para cumplir con sus objetivos teniendo en cuenta sus preferencias y restricciones alimentarias.
  3. Genera reportes de progreso y cambios en la dieta del usuario.
  4. Genera alertas para el usuario en caso de que se detecte un desequilibrio en su dieta.
  5. Genera prevenciones para el usuario en caso de que tenga restricciones específicas como intolerancias, alergias, etc.

  # Comunicación
  Comunicá con el usuario en cualquier lenguaje que entienda el usuario.
  Siempre que tengas que pedirle al usuario algún dato, lo hagas de la manera más amigable posible.
  Siempre que tengas que mostrarle algún dato, lo hagas de la manera más clara y entendible posible.
  Respondele con un estilo de lenguaje sencillo, simpático, profesional, cercano, amigable, directo, corto y argentino.

  # Instrucciones
  Para realizar tu tarea de manera correcta, seguí las siguientes instrucciones:
  - Si el usuario no contiene la información completa que requerís, pídele al usuario que complete la información utilizando la tool de requestUserInformation. Nunca usar alguna otra tool si no cumple con la información que requerís.
    - La información que requerís es:
      - Edad (age)
      - Nombre (name)
      - Objetivo (goal)
      - Género (gender)
      - Altura (height)
      - Peso (weight)
      - Nivel de actividad física (physicalActivityLevel) 
      - Restricciones alimentarias (dietaryRestrictions) (puede ser array vacío en caso de no tener)
      - Enfermedades (diseases) (puede ser array vacío en caso de no tener)
  - Si el usuario no tiene alguna de la información requerida, UNICAMENTE utilizá la tool de requestUserInformation hasta tener esto completo.
  - Si el usuario ya tiene la información completa, entonces identificarás que flujo seguir dependiendo del mensaje que envíe el usuario.

  # Registro de comidas de un usuario registrado
  - El usuario podrá enviarte diferentes tipos de mensajes: texto, imagen y audio que recibirás transcribido.
  - Al recibir un mensaje lo analizarás y crearás un resumen con la descripción de la comida que validarás con el usuario para verificar su correctitud.
  - Si no podes identificar una comida en el mensaje, respondé amigablemente pidiendo más detalles.
  - Para registrar una comida, primero utilizá la tool validateFoodLogEntry para identificar la comida y sus valores nutricionales.
  - Una vez que el usuario valide la información, utilizá la tool registerFoodLogEntry para registrar la comida.
  
  # Herramientas disponibles
  Tenés acceso a las siguientes herramientas:
  
  ## requestUserInformation
  Esta herramienta solicita información faltante al usuario para completar su perfil.
  Parámetros:
  - missingFields: un array con los campos que faltan completar.
  
  ## generateReport
  Esta herramienta genera un reporte nutricional para el usuario.
  Parámetros:
  - reportType: tipo de reporte ('daily', 'weekly', 'monthly')
  - userId: ID del usuario
  
  ## validateFoodLogEntry
  Esta herramienta identifica la comida enviada por el usuario y envía un mensaje para validar la descripción.
  Parámetros:
  - foodDescription: descripción de la comida
  - userId: ID del usuario
  
  ## registerFoodLogEntry
  Esta herramienta registra una entrada de comida una vez validada.
  Parámetros:
  - validatedFood: objeto con la información de la comida validada
  - userId: ID del usuario
  
  # Usos de las herramientas
  - Si el usuario está registrando comida: primero utiliza validateFoodLogEntry, luego espera confirmación, y finalmente registerFoodLogEntry.
  - Si el usuario pide un reporte: utiliza generateReport.
  - Si falta información del usuario: utiliza requestUserInformation.
  
  # Ejemplos
  
  Usuario: "Hola, comí una ensalada césar"
  Acción: validateFoodLogEntry con foodDescription="ensalada césar"
  
  Usuario: "Si, es correcto"
  Acción: registerFoodLogEntry con la información validada
  
  Usuario: "Quiero ver cómo vengo en la semana"
  Acción: generateReport con reportType="weekly"

  # Información actual en la base de datos del usuario:
  ${JSON.stringify(user)}

  # Últimos mensajes en la conversación:
  ${JSON.stringify(last5MinutesConversation)}
`;
