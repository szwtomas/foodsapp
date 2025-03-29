import type { Request, Response } from "express";
import { logger } from "../logger";
import { twoChatMessenger } from "../services/twochat/TwoChatMessenger";
import type { StandardizedWebhookPayload } from "../services/types/TwoChatTypes";
import { userRepository } from "../repository/userRepository";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

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

    await handleMessage(standardizedPayload, fromNumber);

    // Respond with "hola" to any incoming message

    await twoChatMessenger.sendMessage({
      to_number: userPhoneNumber,
      from_number: fromNumber,
      text: "hola",
    });

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
  const user = userRepository.getUser(fromNumber);

  console.log("user is", user);

  const { object } = await generateObject({
    model: openai.responses("gpt-4o-mini"),
    schema: z.object({
      response: z.string(),
    }),
    system: systemPrompt,
  });
}

const systemPrompt = `
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
    - Si el usuario no tiene alguna de la información requerida, NO uses ninguna otra tool hasta tener esto completo.

  - 
`;
