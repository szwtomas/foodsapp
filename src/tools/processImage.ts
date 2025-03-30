import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { generateText } from "ai";
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



export async function processImage(
    userPhoneNumber: string,
    imageUrl: string
): Promise<string> {
    const user = userRepository.getUser(userPhoneNumber);
    if (!user) {
        throw new Error(`User with phone number ${userPhoneNumber} not found`);
    }
    
    sendMessageToUser(userPhoneNumber, `🔍 Estoy procesando tu imagen para analizar los alimentos y su información nutricional. Dame un momento y te compartiré los resultados. ⏳🥦🍗`);
    const description = await generateObject({
        model: openai.responses("gpt-4o"),
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
                content: `Extrae del la foto del usuario una posible comida con su descripción, macro y micro nutrientes.
                En caso de poder identificar una comida y generar una descripción de la misma, entonces analiza los nutrientes
                y crea un objeto JSON con los datos correspondientes.
                Si no se pudo identificar ninguna comida, responde con null.
      
                ES DE SUMA IMPORTANCIA que la descripción de la comida sea lo más sencilla y concisa posible, teniendo en cuenta todos los ingredientes mencionados.
                
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

    // Handle the response from the AI model
    if (!description) {
        throw new Error("No se pudo identificar ninguna comida en la imagen.");
    }

    
    // Parse the JSON response
    
    // Validate with Zod schema
    
    // Convert to FoodLog format
    const foodLog: FoodLog = {
      id: uuidv4(),
      description: description.object.description,
      totalMacros: {
        protein: description.object.totalMacros.protein,
        carbs: description.object.totalMacros.carbs,
        fats: description.object.totalMacros.fats
      },
      totalMicros: description.object.totalMicros,
      foods: description.object.foods,
      date: new Date(),
      status: "pending"
    };
    
    userRepository.addFoodLog(userPhoneNumber, foodLog);

    await sendMessageToUser(userPhoneNumber, buildFoodLogMessage(foodLog));
    
    return "Se ha registrado correctamente la comida.";
}


