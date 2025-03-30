import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { userRepository, FoodLog, Message } from "../repository/userRepository";
import { v4 as uuidv4 } from "uuid";
import { sendMessageToUser } from "./requestUserInformation";
import { buildFoodLogMessage } from "../services/utils";

// Define the Zod schema for type checking the parsed result
const FoodLogResponseSchema = z.object({
    description: z.string(),
    totalMacros: z.object({
        protein: z.number(),
        carbs: z.number(),
        fats: z.number()
    }),
    totalMicros: z.array(z.object({
        name: z.string(),
        amount: z.number()
    })),
    foods: z.array(z.object({
        description: z.string(),
        macros: z.object({
            protein: z.number(),
            carbs: z.number(),
            fats: z.number()
        }),
        micros: z.array(z.object({
            name: z.string(),
            amount: z.number()
        }))
    }))
});

// Convert Message objects to a format that can be passed to the AI model
type MessageForAI = {
    content: {
        text?: string;
        media?: {
            url: string;
            type: string;
            mimeType: string;
        };
    };
    timestamp: Date | string;
    sender: "user" | "assistant";
};

export async function newPendingFoodLogEntry(
    userPhone: string,
    conversationContext: MessageForAI[]
): Promise<string> {
    try {
        const response = await generateObject({
            model: openai("gpt-4o"),
            schema: z.object({
                description: z.string(),
                totalMacros: z.object({
                    protein: z.number(),
                    carbs: z.number(),
                    fats: z.number()
                }),
                totalMicros: z.array(z.object({
                    name: z.string(),
                    amount: z.number()
                })),
                foods: z.array(z.object({
                    description: z.string(),
                    macros: z.object({
                        protein: z.number(),
                        carbs: z.number(),
                        fats: z.number()
                    }),
                    micros: z.array(z.object({
                        name: z.string(),
                        amount: z.number()
                    }))
                }))
            }),

            messages: [
                {
                    role: "system",
                    content: `Extrae del mensaje del usuario un posible alimento y genera titulo sencillo y conciso que lo describa, considerando los ingredientes mencionados. Si el mensaje es ambiguo pero menciona un alimento, infiere su descripción de manera general.

          Luego, analiza sus macro y micronutrientes y crea un objeto JSON.
          Si no se identifica ningún alimento de ninguna forma, responde con "null".
          Es importante que la descripción sea lo más clara y breve posible, adaptándose a la información proporcionada.
          Los micro y macronutrientes deben ser calculados en base a la descripción del alimento, y sus nombres deben estar en el idioma que el usuario utilizó.
          Responde únicamente con el objeto JSON, sin ningún texto adicional.          `
                },
                { role: "user", content: conversationContext.map(msg => (msg.content.text || "") + (msg.content.media ? "\n" + msg.content.media.url : "")).join("\n") }
            ]
        });



        // If the response is 'null', return early
        if (response.object === null) {
            await sendMessageToUser(userPhone, "No pude identificar un alimento en el mensaje. Por favor, intenta de nuevo.");
            return "Se respondió al usuario correctamente.";
        }

        // Parse the JSON response

        // Validate with Zod schema
        const validatedData = FoodLogResponseSchema.parse(response.object);

        // Convert to FoodLog format
        const foodLog: FoodLog = {
            id: uuidv4(),
            description: validatedData.description,
            totalMacros: {
                protein: validatedData.totalMacros.protein,
                carbs: validatedData.totalMacros.carbs,
                fats: validatedData.totalMacros.fats
            },
            totalMicros: validatedData.totalMicros,
            foods: validatedData.foods,
            date: new Date(),
            status: "pending"
        };

        userRepository.addFoodLog(userPhone, foodLog);

        await sendMessageToUser(userPhone, buildFoodLogMessage(foodLog));

        return "Se ha registrado correctamente el alimento.";
    } catch (error) {
        console.error('Error al validar la entrada de alimento:', error);
        await sendMessageToUser(userPhone, "Hubo un error al procesar tu alimento. Por favor, intenta de nuevo con más detalles.");
        return "Error al procesar la entrada de alimento.";
    }
}


