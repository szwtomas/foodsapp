import type { Request, Response } from "express";
import { logger } from "../logger";
import { twoChatMessenger } from "../services/twochat/TwoChatMessenger";
import type { StandardizedWebhookPayload } from "../services/types/TwoChatTypes";
import { type Message, type User, userRepository, UserSchema } from "../repository/userRepository";
import { generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { executeRequestUserInformationTool } from "../tools/requestUserInformation";

// Define the tools schemas
const requestUserInformationSchema = z.object({
  type: z.literal('requestUserInformation'),
  missingFields: z.array(z.enum(['age', 'name', 'goal', 'gender', 'height', 'weight', 'physicalActivityLevel', 'dietaryRestrictions', 'diseases'])),
});

const generateReportSchema = z.object({
  type: z.literal('generateReport'),
  reportType: z.enum(['daily', 'weekly', 'monthly']),
  userId: z.string(),
});

const validateFoodLogEntrySchema = z.object({
  type: z.literal('validateFoodLogEntry'),
  foodDescription: z.string(),
  userId: z.string(),
});

const registerFoodLogEntrySchema = z.object({
  type: z.literal('registerFoodLogEntry'),
  validatedFood: z.object({
    name: z.string(),
    portion: z.string(),
    calories: z.number(),
    macros: z.object({
      proteins: z.number(),
      carbs: z.number(),
      fats: z.number(),
    }),
    micros: z.array(z.object({
      name: z.string(),
      amount: z.number(),
      unit: z.string(),
    })).optional(),
  }),
  userId: z.string(),
});

// Combine all tool schemas
const toolsSchema = z.discriminatedUnion('type', [
  requestUserInformationSchema,
  generateReportSchema,
  validateFoodLogEntrySchema,
  registerFoodLogEntrySchema,
]);

// Define the response schema that includes the tool call
const responseSchema = z.object({
  response: z.string(),
  tool: toolsSchema.optional(),
});

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

    // await twoChatMessenger.sendMessage({
    //   to_number: userPhoneNumber,
    //   from_number: fromNumber,
    //   text: "hola",
    // });

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
  if (!user) {
     userRepository.createUserFromNumber(fromNumber);
  }

  let lastConversationMessages: Message[] = []
  if (user?.conversation?.length){
    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
    lastConversationMessages = user.conversation.filter((msg) => msg.timestamp > last5Minutes);
  }


  const { text: result, steps: steps } = await generateText({
    model: openai("o3-mini", { structuredOutputs: true }),
    tools: {
      requestUserInformation: tool({
        description: "Solicita información al usuario para completar su perfil.",
        parameters: z.object({
          user: UserSchema.describe("El perfil del usuario, los datos están como opcionales porque el objetivo de esta tool es pedirle al usuario que complete la información que le falte."),
        }),
        execute: executeRequestUserInformationTool
      })
    },
    prompt: lastConversationMessages.length ? lastConversationMessages[lastConversationMessages.length - 1]?.content : "",
    system: systemPrompt(user, lastConversationMessages),

  })
  console.log("stepsTaken: ", steps.flatMap((step) => step.toolCalls));
}

const systemPrompt = (user?: User, last5MinutesConversation?:Message[]): string => `
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
  ${user}

  # Últimos mensajes en la conversación:
  ${last5MinutesConversation}
`; 

async function requestUserInformation(
  tool: z.infer<typeof requestUserInformationSchema>,
  userPhoneNumber: string,
  fromNumber: string
): Promise<string> {
  // Get current user info
  const user = userRepository.getUser(userPhoneNumber);
  
  // Generate a message asking for the missing information
  const missingFieldsText = tool.missingFields.join(', ');
  const message = `Para completar tu registro, necesito la siguiente información: ${missingFieldsText}. Podrías por favor darmela uwu?`;
  
  // Send the message to the user
  await twoChatMessenger.sendMessage({
    to_number: userPhoneNumber,
    from_number: fromNumber,
    text: message,
  });
  
  return message;
}

async function generateReport(
  tool: z.infer<typeof generateReportSchema>,
  userPhoneNumber: string,
  fromNumber: string
): Promise<string> {
  // Get user data
  const user = userRepository.getUser(userPhoneNumber);
  if (!user) {
    throw new Error(`User with phone number ${userPhoneNumber} not found`);
  }
  
  // Calculate date range based on report type
  const endDate = new Date();
  const startDate = new Date();
  
  switch (tool.reportType) {
    case 'daily':
      // Set start date to beginning of current day
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      // Set start date to 7 days ago
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'monthly':
      // Set start date to 30 days ago
      startDate.setDate(startDate.getDate() - 30);
      break;
  }
  
  // Get food logs for the specified date range
  const foodLogs = userRepository.getFoodLogsByDateRange(userPhoneNumber, startDate, endDate) || [];
  
  // Calculate nutritional averages
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  let totalCalories = 0;
  
  for (const log of foodLogs) {
    totalProtein += log.totalMacros.protein;
    totalCarbs += log.totalMacros.carbs;
    totalFats += log.totalMacros.fats;
    // Estimate calories based on macros (4 cal/g protein, 4 cal/g carbs, 9 cal/g fat)
    totalCalories += (log.totalMacros.protein * 4) + (log.totalMacros.carbs * 4) + (log.totalMacros.fats * 9);
  }
  
  const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const averageProtein = totalProtein / days;
  const averageCarbs = totalCarbs / days;
  const averageFats = totalFats / days;
  const averageCalories = totalCalories / days;
  
  // Generate simple analysis based on user goals
  let analysis = '';
  if (user.goal && user.goal.length > 0) {
    if (user.goal.includes('loseWeight') && averageCalories > 2000) {
      analysis = 'Estás consumiendo más calorías de las recomendadas para bajar de peso.';
    } else if (user.goal.includes('gainWeight') && averageCalories < 2500) {
      analysis = 'Estás consumiendo menos calorías de las recomendadas para aumentar de peso.';
    } else if (user.goal.includes('eatBalanced')) {
      const proteinPercentage = (averageProtein * 4) / averageCalories;
      const carbsPercentage = (averageCarbs * 4) / averageCalories;
      const fatsPercentage = (averageFats * 9) / averageCalories;
      
      if (proteinPercentage < 0.15 || proteinPercentage > 0.35) {
        analysis = 'Tu consumo de proteínas está fuera del rango recomendado (15-35%).';
      } else if (carbsPercentage < 0.45 || carbsPercentage > 0.65) {
        analysis = 'Tu consumo de carbohidratos está fuera del rango recomendado (45-65%).';
      } else if (fatsPercentage < 0.20 || fatsPercentage > 0.35) {
        analysis = 'Tu consumo de grasas está fuera del rango recomendado (20-35%).';
      } else {
        analysis = 'Tu dieta está bien balanceada. ¡Sigue así!';
      }
    }
  }
  
  if (!analysis) {
    analysis = 'No hay suficientes datos para generar un análisis detallado.';
  }
  
  // Generate report from calculated data
  const reportText = `Aquí está tu reporte nutricional ${tool.reportType}:
` +
    `- Calorías promedio: ${averageCalories.toFixed(0)} kcal
` +
    `- Proteínas promedio: ${averageProtein.toFixed(1)}g
` +
    `- Carbohidratos promedio: ${averageCarbs.toFixed(1)}g
` +
    `- Grasas promedio: ${averageFats.toFixed(1)}g
` +
    `- Análisis: ${analysis}`;
  
  // Send the report to the user
  await twoChatMessenger.sendMessage({
    to_number: userPhoneNumber,
    from_number: fromNumber,
    text: reportText,
  });
  
  return reportText;
}

async function validateFoodLogEntry(
  tool: z.infer<typeof validateFoodLogEntrySchema>,
  userPhoneNumber: string,
  fromNumber: string
): Promise<string> {
  // Identify the food and nutritional values
  const foodAnalysis = await analyzeFood(tool.foodDescription);
  
  // Construct validation message
  // biome-ignore lint/style/useTemplate: <explanation>
      const validationMessage = `Detecté que consumiste: ${foodAnalysis.name}, ${foodAnalysis.portion}
` +
    `Con aproximadamente:
` +
    `- ${foodAnalysis.calories} calorías
` +
    `- ${foodAnalysis.macros.proteins}g de proteínas
` +
    `- ${foodAnalysis.macros.carbs}g de carbohidratos
` +
    `- ${foodAnalysis.macros.fats}g de grasas
` +
    "¿Es esto correcto?";
  
  // Send validation message to user
  await twoChatMessenger.sendMessage({
    to_number: userPhoneNumber,
    from_number: fromNumber,
    text: validationMessage,
  });
  
  return validationMessage;
}

// Helper function to analyze food from description
async function analyzeFood(foodDescription: string) {
  // This would typically call an external nutrition API or use a model
  // For now, we're mocking the response
  return {
    name: foodDescription,
    portion: '1 porción',
    calories: 250,
    macros: {
      proteins: 15,
      carbs: 30,
      fats: 10,
    },
    micros: [
      { name: 'Vitamin C', amount: 10, unit: 'mg' },
      { name: 'Calcium', amount: 100, unit: 'mg' },
    ],
  };
}


