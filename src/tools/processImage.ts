import { generateObject } from "ai";
import { userRepository } from "../repository/userRepository";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { sendMessageToUser } from "./requestUserInformation";

export async function processImage(
    userPhoneNumber: string,
    imageUrl: string
): Promise<string> {
    const user = userRepository.getUser(userPhoneNumber);
    if (!user) {
        throw new Error(`User with phone number ${userPhoneNumber} not found`);
    }

    const description = await generateObject({
        model: openai.responses("gpt-4o"),
        schema: z.object({
            description: z.string(),
        }),
        messages: [
            { role: "system", content: `Definir brevemente los alimentos que se ven en la imagen. 
                Asegurate de mencionar todos los alimentos que se encuentran en la imagen con sus cantidades estimadas, las cuales deben ser específicas.
                Ten en cuenta que la imagen puede contener más de un alimento.
                La imagen puede ser de un paquete, en cuyo caso leer la informacion nutricional del paquete en caso de que sea posible, y si no describir el contenido y predeterminar la cantidad.
                Ejemplos: 
                * "Una manzana roja de 200g."
                * "Un paquete de Doritos de 129g."
                * "Un bloque de chocolate SHOT de 90g. La tabla nutricional por porción (22.5 g) muestra: 
                    *   125 kilocalorías
                    *   11g de carbohidratos
                    *   7.9g de grasa
                    *   2.5g de proteínas"
                * "Un plato de pasta con salsa de tomate y queso parmesano de 400g."
                * "Una empanada de carne y una empanada de verdura de 150g cada una."
                Si no puedes identificar ningún alimento relevante, responde con null.` },
            { role: "user", content: [{
                    type: "image",
                    image: imageUrl,
                }]
            }]
    });

    if (!description.object.description || description.object.description.includes("null")) {
        console.log(`User ${userPhoneNumber} uploaded an image with no food identified.`);
        await sendMessageToUser(userPhoneNumber, "No pude identificar una comida en la foto. Por favor, intenta de nuevo.")
          return "Se respondió al usuario correctamente.";
    }

    console.log(`User ${userPhoneNumber} uploaded an image with the following description: ${description.object.description}`);

    return `El usuario ha subido una imagen con la siguiente descripción: ${description.object.description}`;
}

