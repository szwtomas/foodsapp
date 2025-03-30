import type { Request, Response } from "express";
import { logger } from "../logger";
import { twoChatMessenger } from "../services/twochat/TwoChatMessenger";
import type { StandardizedWebhookPayload } from "../services/types/TwoChatTypes";
import {
    type Message,
    type User,
    userRepository,
} from "../repository/userRepository";
import { generateText, tool } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { executeRequestUserInformationTool, sendMessageToUser } from "../tools/requestUserInformation";
import { processImage } from "../tools/processImage";
import { generateReport } from "../tools/generateReport";
import { newPendingFoodLogEntry } from "../tools/newPendingFoodLogEntry";
import { saveUserData } from "../tools/saveUserData";
import { foodLogEntryConfirmation } from "../tools/foodLogEntryConfirmation";
import { pendingFoodLogEntryCorrection } from "../tools/pendingFoodLogEntryCorrection";
export async function receiveWebhook(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const { body } = req;
        logger.info({ body }, "Received webhook");
        res.status(200).send({ message: "Webhook processed successfully" });
        const payload = await twoChatMessenger.processWebhookPayload(body);
        if ("event" in payload && payload.event === "message.read") {
            logger.info({ payload }, "Message read event");
            res.status(200).send({ message: "Message read event processed" });
            return;
        }

        const standardizedPayload = payload as StandardizedWebhookPayload;
        const userPhoneNumber = standardizedPayload.from;

        logger.info(
            {
                from: userPhoneNumber,
                messageType: standardizedPayload.type,
                messageId: standardizedPayload.messageId,
            },
            "Received message"
        );

        await handleMessage(standardizedPayload, userPhoneNumber);
    } catch (error) {
        logger.error(error, "Error processing webhook");
        res
            .status(500)
            .send({ message: "An error occurred while processing webhook" });
    }
}

function userIsInOnboarding(user: User): boolean {
    return user.age === undefined
        || user.name === undefined
        || user.goal === undefined
        || user.sex === undefined
        || user.height === undefined
        || user.weight === undefined
        || user.physicalActivityLevel === undefined
        || user.dietaryRestrictions === undefined
        || user.diseases === undefined;
}

async function handleMessage(
    payload: StandardizedWebhookPayload,
    fromNumber: string
) {
    let user = userRepository.getUser(fromNumber);
    console.log("user is", user);
    if (!user) {
        user = userRepository.createUserFromNumber(fromNumber);
        userRepository.addMessage(user.phoneNumber, {
            content: { text: payload.content.text, media: payload.content.media },
            sender: "user",
        });

        const introMessage = `Hola! Soy Nutrito, *tu asistente nutricional de Foodsapp* 🌽🍔🍇!
    
    Me crearon para ayudarte a *alcanzar tus objetivos nutricionales* teniendo en cuenta tus preferencias y restricciones alimentarias.

    Para poder ayudarte lo mejor posible, *voy a necesitar algunos datos necesarios*. Me los podés contar por texto o audio, como te sea más cómodo.
    
    Por favor, pasame la siguiente información:
- Edad
- Nombre
- Objetivo físico (bajar de peso, ganar peso, mantenerse, etc)
- Sexo
- Altura en cm
- Peso en kg
- Nivel de actividad física (sedentario, ligero, moderado, activo, muy activo)
- Restricciones alimentarias, mencionando si tenés o no
- Enfermedades, o avisando que no tenés ninguna si es el caso`;

        userRepository.addMessage(user.phoneNumber, {
            content: { text: introMessage },
            sender: "assistant",
        });

        await twoChatMessenger.sendMessage({
            to_number: fromNumber,
            from_number: process.env.TWO_CHAT_PHONE_NUMBER || "",
            text: introMessage
        });

        return;
    } else {
      userRepository.addMessage(user.phoneNumber, {
        content: { text: payload.content.text, media: payload.content.media },
        sender: "user",
      });
    }
    
    let lastConversationMessages: Message[] = [];
    if (user?.conversation?.length) {
        const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
        lastConversationMessages = user.conversation.filter(
            (msg) => msg.timestamp > last5Minutes
        );
    }

    if (userIsInOnboarding(user)) {
        console.log("user is in onboarding");
        sendMessageToUser(user.phoneNumber, `🛠️ Estoy analizando los datos para verificar si podemos crear tu usuario. Dame un momento mientras realizo la validación. ⏳`);
        const { text: result, steps } = await generateText({
            model: openai.responses("o3-mini"),
            prompt: lastConversationMessages.map(msg => `${msg.content.text}\n${msg.content.media?.url || ""}`).join("\n"),
            system: onboardingSystemPrompt(user, lastConversationMessages),
            maxSteps: 2,
            toolChoice: 'required',
            tools: {
                requestUserInformation: tool({
                    description:
                        "Solicita información al usuario para completar su perfil en caso de que no tenga toda la información necesaria.",
                    parameters: z.object({
                        user: z
                            .object({
                                phoneNumber: z.string(),
                            })
                            .describe(
                                `El numero de telefono del usuario, es siempre ${user.phoneNumber}`
                            ),
                    }),
                    execute: async ({ user }, messages) => {
                      console.log("inside executeRequestUserInformationTool, received user", user);

                      if (messages.messages.length > 2 && messages.messages[2].role === "tool" && messages.messages[2]?.content[0]?.toolName === "requestUserInformation") {
                        return 'terminar flujo';
                      }
                      return await executeRequestUserInformationTool({user});
                    }
                }),
                saveUserInformation: tool({
                    description: "Guarda la información del usuario si su mensaje aporta datos. Si hay datos faltantes llamar a la tool de requestUserInformation.",
                    parameters: z.object({
                        user: z.object({
                            phoneNumber: z.string().describe("El numero de telefono del usuario, provisto en el ultimo mensaje del usuario. Si el usuario no aporta este dato, mandar un string vacío"),
                            age: z.number().describe("La edad del usuario, provista en el ultimo mensaje del usuario. Si el usuario no aporta este dato, mandar un string vacío"),
                            name: z.string().describe("El nombre del usuario, provisto en el ultimo mensaje del usuario. Si el usuario no aporta este dato, mandar un string vacío"),
                            goal: z.array(z.string()).describe("El objetivo del usuario, provisto en el ultimo mensaje del usuario. Si el usuario no aporta este dato, mandar un string vacío. Si el usuario menciona el objetivo en otro idioma que ingles (loseWeight, gainWeight, maintainWeight, eatWholeFoods, eatBalanced), entonces traducelo a una de esas opciones escritas tal cual, y si no concuerda con ninguna, elije eatWholeFoods."),
                            sex: z.string().describe("El sexo del usuario, provisto en el ultimo mensaje del usuario. Si el usuario no aporta este dato, mandar un string vacío. Si el usuario lo menciona en otro idioma que ingles (male, female u other), entonces traducelo a una de esas 3 opciones, male female u other"),
                            height: z.number().describe("La altura del usuario, provista en el ultimo mensaje del usuario. Si el usuario no aporta este dato, mandar un string vacío"),
                            weight: z.number().describe("El peso del usuario, provisto en el ultimo mensaje del usuario. Si el usuario no aporta este dato, mandar un string vacío"),
                            physicalActivityLevel: z.string().describe("El nivel de actividad física del usuario, provisto en el ultimo mensaje del usuario. Si el usuario no aporta este dato, mandar un string vacío. Si el usuario menciona el nivel de actividad física en otro idioma que ingles (sedentary, light, moderate, active, veryActive), entonces traducelo a una de esas opciones escritas tal cual, y si no concuerda con ninguna, elije moderate."),
                            diseases: z.array(z.string()).describe("Las enfermedades del usuario, provistas en el ultimo mensaje del usuario. Si el usuario no aporta este dato, mandar un string vacío"),
                            dietaryRestrictions: z.array(z.string()).describe("Las restricciones alimentarias del usuario, provistas en el ultimo mensaje del usuario. Si el usuario no aporta este dato, mandar un string vacío"),
                        })
                    }),
                    execute: async (user, messages) => {
                        console.log("inside saveUserData", user);
                        if (messages.messages.length > 2 && messages.messages[2].role === "tool" && messages.messages[2]?.content[0]?.toolName === "saveUserInformation") {
                          return 'terminar flujo';
                        }
                        return await saveUserData(user);
                    }
                })
            }
        });

        console.log("result", result);
        console.log("steps", steps.flatMap((step) => step.toolCalls));
        console.log("user is in onboarding flow returned");
        const newUserData = userRepository.getUser(fromNumber);
        console.log("newUserData after flow", newUserData);
        return;
    }

    console.log("user is not in onboarding!!!");
    if (payload.content.media) {
        // sendMessageToUser(user.phoneNumber, "Estoy procesando tu mensaje para analizar los alimentos y su información nutricional. Dame un momento y te compartiré los resultados. ⏳🥩");
        const { text: result, steps } = await generateText({
            model: openai("o3-mini", { structuredOutputs: true }),
            tools: {
                processImage: tool({
                    description: "Procesa una imagen para identificar alimentos.",
                    parameters: z.object({
                        userPhoneNumber: z.string().describe("El número de teléfono del usuario"),
                        imageUrl: z.string().describe("URL de la imagen a procesar")
                    }),
                    execute: async ({ userPhoneNumber, imageUrl }, messages) => {
                      if (messages.messages.length > 2 && messages.messages[2].role === "tool" && messages.messages[2]?.content[0]?.toolName === "processImage") {
                        return 'terminar flujo';
                      }
                        return await processImage(userPhoneNumber, imageUrl);
                    }
                }),
                generateReport: tool({
                    description: "Genera un reporte nutricional para el usuario.",
                    parameters: z.object({
                        userPhoneNumber: z.string().describe("El número de teléfono del usuario"),
                        startDate: z.string().describe("La fecha de inicio del reporte en el formato: 'YYYY-MM-DD'"),
                        endDate: z.string().describe("La fecha de fin del reporte en el formato: 'YYYY-MM-DD'"),
                    }),
                    execute: async ({ userPhoneNumber, startDate, endDate }, messages) => {
                      if (messages.messages.length > 2 && messages.messages[2].role === "tool" && messages.messages[2]?.content[0]?.toolName === "generateReport") {
                        return 'terminar flujo';
                      }
                        return await generateReport(userPhoneNumber, startDate, endDate);
                    }
                })
            },
            prompt: lastConversationMessages.map(msg => `${msg.content.text}\n${msg.content.media?.url || ""}`).join("\n"),
            system: systemPrompt(user, lastConversationMessages),
            maxSteps: 2
        });
        console.log(
            "stepsTaken: ",
            steps.flatMap((step) => step.toolCalls)
        );
        return result;
    } else {
        // sendMessageToUser(user.phoneNumber, "Estoy procesando tu mensaje para analizar los alimentos y su información nutricional. Dame un momento y te compartiré los resultados. ⏳🥩");
        const { text: result, steps } = await generateText({
            model: openai("o3-mini", { structuredOutputs: true }),
            tools: {
                newPendingFoodLogEntry: tool({
                    description: "Extrae descripcion de alimentos de los mensajes del usuario para registrar los alimentos en estado pendiente de validacion.",
                    parameters: z.object({
                        userPhone: z.string().describe("El número de teléfono del usuario"),
                        conversationContext: z.array(
                            z.object({
                                content: z.object({
                                    text: z.string(),
                                    media: z.object({
                                        url: z.string(),
                                        type: z.string(),
                                        mimeType: z.string()
                                    })
                                }),
                                timestamp: z.string(), // Using string for date compatibility with JSON schema
                                sender: z.enum(["user", "assistant"])
                            })
                        )
                    }),
                    execute: async ({ userPhone, conversationContext }, messages) => {  
                      if (messages.messages.length > 2 && messages.messages[2].role === "tool" && messages.messages[2]?.content[0]?.toolName === "newPendingFoodLogEntry") {
                        return 'terminar flujo';
                      }
                        console.log(`inside newPendingFoodLogEntry for user ${userPhone}`);
                        // Convert the conversation context to the format expected by newPendingFoodLogEntry
                        // This is already in the right format since we defined the schema above

                        const user = userRepository.getUser(userPhone);
                        if (!user || !user.conversation) {
                            return "No se encontró el usuario o no tiene conversación.";
                        }

                        // Use the last few messages as context
                        const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
                        const recentMessages = user.conversation.filter(msg => msg.timestamp > last5Minutes);

                        // Pass the messages directly since they're already in the correct format
                        return await newPendingFoodLogEntry(userPhone, conversationContext);
                    }
                }),
                pendingFoodLogEntryCorrection: tool({
                    description: "Corrige la entrada de alimento pendiente.",
                    parameters: z.object({
                        userPhone: z.string().describe("El número de teléfono del usuario"),
                        conversationContext: z.array(
                            z.object({
                                content: z.object({
                                    text: z.string(),
                                    media: z.object({
                                        url: z.string(),
                                        type: z.string(),
                                        mimeType: z.string()
                                    })
                                }),
                                timestamp: z.string(), // Using string for date compatibility with JSON schema
                                sender: z.enum(["user", "assistant"])
                            })
                        )
                    }),
                    execute: async ({ userPhone, conversationContext }) => {
                        console.log(`inside pendingFoodLogEntryCorrection for user ${userPhone}`);
                        return await pendingFoodLogEntryCorrection(userPhone, conversationContext);
                    }
                }),
                foodLogEntryConfirmation: tool({
                    description: "Registra la validación de la última entrada de alimento pendiente.",
                    parameters: z.object({
                        userPhoneNumber: z.string().describe("El número de teléfono del usuario")
                    }),
                    execute: async ({ userPhoneNumber }, messages) => {
                        if (messages.messages.length > 2 && messages.messages[2].role === "tool" && messages.messages[2]?.content[0]?.toolName === "foodLogEntryConfirmation") {
                            return 'terminar flujo';
                        }
                        console.log(`inside foodLogEntryConfirmation for user ${userPhoneNumber}`);
                        return await foodLogEntryConfirmation(userPhoneNumber);
                    }
                }),
                generateReport: tool({
                    description: "Genera un reporte nutricional para el usuario.",
                    parameters: z.object({
                        userPhoneNumber: z.string().describe("El número de teléfono del usuario"),
                        startDate: z.string().describe("La fecha de inicio del reporte en el formato: 'YYYY-MM-DD'"),
                        endDate: z.string().describe("La fecha de fin del reporte en el formato: 'YYYY-MM-DD'"),
                    }),
                    execute: async ({ userPhoneNumber, startDate, endDate }, messages) => {
                        if (messages.messages.length > 2 && messages.messages[2].role === "tool" && messages.messages[2]?.content[0]?.toolName === "generateReport") {
                            return 'terminar flujo';
                        }
                        console.log(`inside generateReport for user ${userPhoneNumber}`);
                        return await generateReport(userPhoneNumber, startDate, endDate);
                    }
                }),
            },
            prompt: lastConversationMessages.map(msg => `${msg.content.text}\n${msg.content.media?.url || ""}`).join("\n"),
            system: systemPrompt(user, lastConversationMessages),
            maxSteps: 2,
            toolChoice: "required"
        });
        console.log(
            "stepsTaken: ",
            steps.flatMap((step) => step.toolCalls)
        );
    }
}

const onboardingSystemPrompt = (
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
  
  Vas a decidir entre 2 tools para ejecutar:
  1- requestUserInformation: Cuando el usuario no tiene toda la información necesaria para registrarse, y en su mensaje actual NO NOS ESTÁ DANDO TODOS LOS DATOS QUE NECESITAMOS
  entonces debes ejecutar esta tool para pedirle al usuario que complete la información. Los datos que debes tener son:
  - Edad (age)
  - Nombre (name)
  - Objetivo (goal)
  - Sexo (sex)
  - Altura (height)
  - Peso (weight)
  - Nivel de actividad física (physicalActivityLevel) 
  - Restricciones alimentarias (dietaryRestrictions) (puede ser array vacío en caso de no tener)
  - Enfermedades (diseases) (puede ser array vacío en caso de no tener)

  SOLO EJECUTA ESTA TOOL CUANDO EL USUARIO NO TENGA TODA LA INFORMACIÓN NECESARIA.

  2- saveUserInformation: Cuando el ÚLTIMO MENSAJE DEL USUARIO tiene al menos parcialmente la información necesaria, entonces debes ejecutar esta tool para guardar la información en la base de datos. 
  Si el mensaje del usuario NO aporta datos, entonces no ejecutes esta tool, en cambio si aporta datos, entonces DEBES ejecutar esta tool para guardar la información.

  Si el usuario menciona el sexo en otro idioma que ingles (male, female u other), entonces traducelo a una de esas 3 opciones, male female u other.
  Si el usuario menciona el objetivo en otro idioma que ingles (loseWeight, gainWeight, maintainWeight, eatWholeFoods, eatBalanced), entonces traducelo a una de esas opciones escritas tal cual, y si no concuerda con ninguna, elije eatWholeFoods.
  Si el usuario menciona el nivel de actividad física en otro idioma que ingles (sedentary, light, moderate, active, veryActive), entonces traducelo a una de esas opciones escritas tal cual, y si no concuerda con ninguna, elije moderate.
  # El numero de telefono del usuario es: ${user?.phoneNumber}

  # Últimos mensajes en la conversación:
  ${JSON.stringify(last5MinutesConversation)}

  A partir de estos últimos mensajes, decí si el usuario tiene toda la información necesaria para registrarse o no.

`;

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
      - Sexo (sex)
      - Altura (height)
      - Peso (weight)
      - Nivel de actividad física (physicalActivityLevel) 
      - Restricciones alimentarias (dietaryRestrictions) (puede ser array vacío en caso de no tener)
      - Enfermedades (diseases) (puede ser array vacío en caso de no tener)
  - Si el usuario no tiene alguna de la información requerida, UNICAMENTE utilizá la tool de requestUserInformation hasta tener esto completo.
  - Si el usuario ya tiene la información completa, entonces identificarás que flujo seguir dependiendo del mensaje que envíe el usuario.

  - Si el usuario pide un reporte o analisis entre fechas especificas, entonces DEBES usar el tool generateReport.

  - Si el usuario manda una foto entonces DEBES usar el tool processImage para identificar los alimentos. 

  # Registro de alimentos de un usuario registrado
  - El usuario podrá enviarte diferentes tipos de mensajes: texto, imagen y audio que recibirás transcribido.
  - Al recibir un mensaje lo analizarás y crearás un resumen con la descripción de el alimento que validarás con el usuario para verificar su correctitud.
  - Si no podes identificar un alimento en el mensaje, respondé amigablemente pidiendo más detalles.
  - Cuando el usuario manda un mensaje sobre alimentos, se utilizará la tool newPendingFoodLogEntry para generar una descripcion de el alimento y sus valores nutricionales, guarando la informacion con estado pendiente de validacion.
  - Si el usuario confirma la descripcion de el alimento, se utilizará la tool foodLogEntryConfirmation para validar la entrada de alimento.
  - En caso de que el usuario niegue la descripcion de el alimento, se utilizará la tool pendingFoodLogEntryCorrection para corregir la entrada de alimento pendiente.
  
  # Herramientas disponibles
  Tenés acceso a las siguientes herramientas:
  
  ## requestUserInformation
  Esta herramienta solicita información faltante al usuario para completar su perfil.
  Parámetros:
  - missingFields: un array con los campos que faltan completar.
  
  ## generateReport
  Esta herramienta genera un reporte nutricional para el usuario.
  Parámetros:
  - startDate: fecha de inicio del reporte
  - endDate: fecha de fin del reporte
  - userPhone: user phone number.
  
  ## newPendingFoodLogEntry
  Esta herramienta identifica el alimento enviada por el usuario, generando una descripcion de la misma. Envía un mensaje al usuario para validar la descripción.
  Parámetros:
  - conversationContext: contexto reciente de la conversación.
  - userPhone: user phone number.
  
  ## foodLogEntryConfirmation
  Esta herramienta registra una entrada de alimento una vez validada.
  Parámetros:
  - userPhone: user phone number.

  ## pendingFoodLogEntryCorrection
  Esta herramienta corrige la ultima entrada de alimento pendiente.
  Parámetros:
  - userPhone: user phone number.
  - conversationContext: contexto reciente de la conversación

  ## processImage
  Esta herramienta procesa una imagen para identificar alimentos. Si o si debes llamar a esta herramienta cuando el usuario envíe una imagen.
  Parámetros:
  - userPhoneNumber: user phone number.
  - imageUrl: URL de la imagen a procesar
  - userPhone: user phone number.
  
  ## foodLogEntryConfirmation
  Esta herramienta registra la validacion de la ultima entrada de alimento pendiente a ser validada.
  Parámetros:
  - userPhone: user phone number.
  
  # Usos de las herramientas
  - Si el usuario está registrando alimentos: primero utiliza newPendingFoodLogEntry. Si el usuario confirma la descripcion, se utilizara foodLogEntryConfirmation. Si el usuario niega la descripcion, se debera utilizar pendingFoodLogEntryCorrection.
  - Si el usuario pide un reporte: utiliza generateReport.
  - Si falta información del usuario: utiliza requestUserInformation.
  
  # Ejemplos
  
  Usuario: "Hola, comí una ensalada césar"
  Acción: newPendingFoodLogEntry con los mensajes de la conversación. Se enviara un mensaje al usuario con la descripción de el alimento para validar.
    Caso confirmacion: 
      Usuario: "Si, es correcto"
      Acción: foodLogEntryConfirmation
    Caso correccion:
      Usuario: "No! Comi una papas"
      Acción: pendingFoodLogEntryCorrection con los ultimos mensajes de la conversación
  
  Usuario: "Quiero ver cómo vengo en la semana"
  Acción: generateReport con startDate=fechaInicio, endDate=fechaFin

  # Información actual en la base de datos del usuario:
  ${JSON.stringify(user)}

  # Últimos mensajes en la conversación:
  ${JSON.stringify(last5MinutesConversation)}
`;