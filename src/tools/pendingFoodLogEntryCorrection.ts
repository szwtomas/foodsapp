


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

export async function pendingFoodLogEntryCorrection(
  userPhone: string,
  conversationContext: MessageForAI[]
): Promise<string> {
  try {
    sendMessageToUser(userPhone, `🧐 Estoy corrigiendo el registro del y su información nutricional. Dame un momento y te compartiré los resultados. ⏳`);
    const response = await generateObject({
      model: openai("gpt-4o"),
      messages: [
        { 
          role: "system", 
          content: `Extrae de los ultimos mensajes del usuario (considerando que el usuario realizo una correccion al ultimo registro de alimento) un posible alimento con su descripción, macro y micro nutrientes.
          En caso de poder identificar un alimento y generar una descripción de la misma, entonces analiza los nutrientes
          y crea un objeto JSON con los datos correspondientes.
          Asegurate de que la correccion hecha por el usuario este presente en la nueva descripcion de el alimento.
          Si no se pudo identificar ningun alimento, responde con null.

          ES DE SUMA IMPORTANCIA que la descripción de el alimento sea lo más sencilla y concisa posible, teniendo en cuenta todos los ingredientes mencionados.
          
          el campo descripción debe ser lo más claro y breve posible. Ejemplos:
          - "Ensalada de lechuga, tomate y cebolla"
          - "Sandwich de pollo con queso y lechuga"
          - "Sopa de pollo"
          - "Arroz con pollo"
          - "Pizza de pepperoni"
          - "Tostada de jamón y queso"
          - "Vaso de leche"
          - "Taza de café"
          - "Bocadillo de Tofu"
          
          si la descripción tiene un typo, corrige el typo inteligentemente con lo más aproximado a lo que probablemente se referia el usuario.

          ejemplos de respuestas:
          
          {
            "description": "Ensalada de lechuga, tomate y cebolla",
            "totalMacros": {
                "protein": 0.5,
                "carbs": 10,
                "fats": 0.2
            },
            "totalMicros": [
                {
                    "name": "Calcio",
                    "amount": 100
                },
                {
                    "name": "Fósforo",
                    "amount": 50
                }
            ],
            "foods": [
            {
                "description": "tomate",
                "macros": {
                    "protein": 0.5,
                    "carbs": 10,
                    "fats": 0.2
                },
                "micros": [
                    {
                        "name": "Calcio",
                        "amount": 100
                    }
                ],
            },
            {
                "description": "lechuga",
                "macros": {
                    "protein": 0.5,
                    "carbs": 10,
                    "fats": 0.2
                },
                "micros": [
                    {
                        "name": "Vitamina C",
                        "amount": 200
                    }
                ]
            }
          }
          

          
          Responde SOLO con el objeto JSON, sin ningún texto adicional.
          
          esta es la conversacion de los ultimos 5 minutos:
          ${conversationContext.map(msg => (msg.content.text || "") + (msg.content.media ? "\n" + msg.content.media.url : "")).join("\n")}
          `
        },
        { role: "user", content: conversationContext[conversationContext.length - 1].content.text ?? "" }
      ],
      schema: FoodLogResponseSchema

    });

    
    // Handle the response from the AI model
    
    // If the response is 'null', return early
    if (response === null) {
      await sendMessageToUser(userPhone, "No pude identificar un alimento en el mensaje. Por favor, intenta de nuevo.");
      return "Se respondió al usuario correctamente.";
    }
    
    // Parse the JSON response
    
    // Validate with Zod schema
    
    // Convert to FoodLog format
    const foodLog: FoodLog = {
      id: uuidv4(),
      description: response.object.description,
      totalMacros: {
        protein: response.object.totalMacros.protein,
        carbs: response.object.totalMacros.carbs,
        fats: response.object.totalMacros.fats
      },
      totalMicros: response.object.totalMicros,
      foods: response.object.foods,
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


