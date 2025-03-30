import { generateObject } from "ai";
import { userRepository } from "../repository/userRepository";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { sendMessageToUser } from "./requestUserInformation";

export async function processImage(
    userPhoneNumber: string,
    image_url: string
): Promise<string> {
    const user = userRepository.getUser(userPhoneNumber);
    if (!user) {
        throw new Error(`User with phone number ${userPhoneNumber} not found`);
    }

    const description = await generateObject({
        model: openai("o3-mini"),
        schema: z.object({
            description: z.string(),
        }),
        messages: [
            { role: "system", content: `Describe la imagen centrandote en que alimentos aparecen en ella. 
                Detalla lo más posible los alimentos y las cantidades que aparecen en la imagen.
                Ten en cuenta que la imagen puede contener más de un alimento.
                Si no puedes identificar ningún alimento relevante, responde con null.` },
            { role: "user", content: [{
                    type: "image",
                    image: image_url,
                }]
            }]
    });

    if (!description.object.description) {
        await sendMessageToUser(userPhoneNumber, "No pude identificar una comida en la foto. Por favor, intenta de nuevo.")
          return "Se respondió al usuario correctamente.";
    }


    return `El usuario ha subido una imagen con la siguiente descripción: ${description.object.description}`;
}

