import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { userRepository, FoodLog, Message } from "../repository/userRepository";
import { v4 as uuidv4 } from "uuid";
import { sendMessageToUser } from "./requestUserInformation";

// Define the schema for the AI response
const FoodLogResponseSchema = z.object({
  id: z.string().optional(),
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
  })),
  date: z.string().optional(),
  status: z.enum(["pending", "validated"]).optional()
}).nullable();

export async function validateFoodLogEntry(
  userPhone: string,
  conversationContext: Message[]
): Promise<string> {
  // Use generateObject with the defined schema for type safety
  const { object: result } = await generateObject({
    model: openai("o3-mini"),
    schema: FoodLogResponseSchema,
    messages: [
      { 
        role: "system", 
        content: `Extrae del mensaje del usuario una posible comida con su descripción, macro y micro nutrientes.
        En caso de poder identificar una comida y generar una descripción de la misma, entonces analiza los nutrientes
        y crea un objeto FoodLog con los datos correspondientes.
        Si no se pudo identificar ninguna comida, responde con null.
        Un objeto FoodLog tiene la siguiente forma:
        {
          id: string,
          description: string,
          totalMacros: {
            protein: number,
            carbs: number,
            fats: number
          },
          totalMicros: [
            {
              name: string,
              amount: number
            } 
          ],
          foods: [
            {
              description: string,
              macros: {
                protein: number,
                carbs: number,
                fats: number
              },
              micros: [
                {
                  name: string,
                  amount: number
                }
              ]
            }
          ]
        }
          `
      },
      { role: "user", content: conversationContext.map(msg => msg.content).join("\n") }
    ]
  });

  // If the response is null, return null
  if (!result) {
    await sendMessageToUser(userPhone, "No pude identificar una comida en el mensaje. Por favor, intenta de nuevo.")
    return "Se respondió al usuario correctamente.";
  }
  
  // Convert to FoodLog format with proper mapping for foods array
  const foodLog: FoodLog = {
    id: uuidv4(),
    description: result.description,
    totalMacros: {
      protein: result.totalMacros.protein,
      carbs: result.totalMacros.carbs,
      fats: result.totalMacros.fats
    },
    totalMicros: result.totalMicros,
    // Use the foods array directly since it now matches the expected structure
    foods: result.foods,
    date: new Date(),
    status: "pending"
  };
  
  userRepository.addFoodLog(userPhone, foodLog);
  
  return "Se respondió al usuario correctamente.";
}