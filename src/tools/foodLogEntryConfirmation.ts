import { generateObject } from "ai";
import { userExpectedDailyCaloriesRepository } from "../repository/userExpectedDailyCaloriesRepository";
import { userRepository } from "../repository/userRepository";
import { sendMessageToUser } from "./requestUserInformation";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

function getTodayAndTomorrowAt1AM(): { today: Date; tomorrow: Date } {
  const now = new Date();
  
  const today = new Date(now);
  today.setHours(1, 0, 0, 0); // Set time to 1:00 AM today
  
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1); // Move to tomorrow
  tomorrow.setHours(1, 0, 0, 0); // Set time to 1:00 AM
  
  return { today, tomorrow };
}


export async function foodLogEntryConfirmation (
  userPhoneNumber: string
): Promise<string> {
  const user = userRepository.getUser(userPhoneNumber);
  if (!user) {
    throw new Error(`User with phone number ${userPhoneNumber} not found`);
  }
  
  const lastPendingFoodLogEntry = userRepository.getLastPendingFoodLogEntry(userPhoneNumber);
  if (!lastPendingFoodLogEntry) {
    throw new Error(`No pending food log entry found for user with phone number ${userPhoneNumber}`);
  }

  lastPendingFoodLogEntry.status = "validated";
  userRepository.updateFoodLog(userPhoneNumber, lastPendingFoodLogEntry.id, lastPendingFoodLogEntry);
  
  sendMessageToUser(userPhoneNumber, `Gracias por registrar tu consumo de ${lastPendingFoodLogEntry.description}`); // TODO NTH: insight about food

  console.log("Starting insight calculation...");
  const userCalores = userExpectedDailyCaloriesRepository.getEntry(userPhoneNumber);

  const { today, tomorrow } = getTodayAndTomorrowAt1AM();

  const foodLogEntries = userRepository.getFoodLogsByDateRange(
    userPhoneNumber,
    new Date(today),
    new Date(tomorrow)
);

  const prompt = `
Un user acaba de comer esta comida: ${lastPendingFoodLogEntry.description}
Sos un chatbot que da recomendaciones de alimentos para un user. El objetivo de este user en particular es ${user?.goal?.join(", ")}.
Sus necesidades caloricas son de ${userCalores?.dailyCaloriesNumber ?? 2000}

Dale un muy breve insight sobre lo que comió recién, y sugerencia de alimentos para el dia de hoy.
Que sea muy corto, algo como "Que rico! Que bueno que estas comiendo fruta!" si comió una manzana, o si comió una pizza algo como:
Venís bien! Pero ojo con no pasarte mucho de las calorias que necesitas! Hoy llevas aproximadamente X.
Para saber cuantas calorias comio ya hoy, considerá que lo que comió hoy es: ${JSON.stringify(foodLogEntries)}.

Por favor, poné en bold los valores de calorías, e incluí los valores cuando esté cerca de pasar el límite o lo haya pasado.
En cuanto al estilo, habla en 2 parrafos muy chicos, uno con un insight de la comida y recomendaciones para el dia de hoy, otro con como viene con su objetivo diario de calorias

Usa un tono muy humano, como si fuera un amigo que te cuenta lo que comió.
Hacelo bastante corto, algo asi:
Que rico! La manzana es una muy buena fuente de fibra y vitaminas, te re sirven! (en otro parrado decir) Hoy vas 100 calorías, venis re bien!

O

Que rico que comiste pizza! Ojo que tiene bastante grasa, pero esta bueno para comer cada tanto.
Hoy venis 3200 calorías consumidas, te pasaste 500 de tu objetivo de 2700, te diría que regules to ingesta el resto del día :)
  `;

  const insight = await generateObject({
    model: openai("gpt-4o"),
    schema: z.object({ description: z.string() }),
    messages: [{ role: "system", content: prompt }],
  });

  console.log("Insight: ", insight.object.description);
  if (insight.object.description) {
    console.log("Sending insight to user");
    sendMessageToUser(userPhoneNumber, insight.object.description);
  } else {
    console.log("No insight found");
  }

  return `Gracias por registrar tu consumo de ${lastPendingFoodLogEntry.description} ✅  `; // TODO NTH: insight about food


}