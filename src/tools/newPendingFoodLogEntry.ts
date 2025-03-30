import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
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
    // Use generateText instead of generateObject for better compatibility
    const response = await generateText({
      model: openai("gpt-4o"),
      messages: [
        { 
          role: "system", 
          content: `Extrae del mensaje del usuario un posible alimento con su descripción, macro y micro nutrientes.
          En caso de poder identificar un alimento y generar una descripción de la misma, entonces analiza los nutrientes
          y crea un objeto JSON con los datos correspondientes.
          Si no se pudo identificar ningun alimento, responde con null.

          ES DE SUMA IMPORTANCIA que la descripción de el alimento sea lo más sencilla y concisa posible, teniendo en cuenta todos los ingredientes mencionados.
          
          El objeto debe tener la siguiente estructura:
          {
            "description": string,
            "totalMacros": {
              "protein": number,
              "carbs": number,
              "fats": number
            },
            "totalMicros": [
              {
                "name": string,
                "amount": number
              } 
            ],
            "foods": [
              {
                "description": string,
                "macros": {
                  "protein": number,
                  "carbs": number,
                  "fats": number
                },
                "micros": [
                  {
                    "name": string,
                    "amount": number
                  }
                ]
              }
            ]
          }
          
          Responde SOLO con el objeto JSON, sin ningún texto adicional.`
        },
        { role: "user", content: conversationContext.map(msg => (msg.content.text || "") + (msg.content.media ? "\n" + msg.content.media.url : "")).join("\n") }
      ]
    });

    
    // Handle the response from the AI model
    const responseText = response.text;
    
    // If the response is 'null', return early
    if (responseText.trim() === 'null') {
      await sendMessageToUser(userPhone, "No pude identificar un alimento en el mensaje. Por favor, intenta de nuevo.");
      return "Se respondió al usuario correctamente.";
    }
    
    // Parse the JSON response
    const parsedResponse = JSON.parse(responseText);
    
    // Validate with Zod schema
    const validatedData = FoodLogResponseSchema.parse(parsedResponse);
    
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


