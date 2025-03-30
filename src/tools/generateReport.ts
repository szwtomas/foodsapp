import { generateObject } from "ai";
import { userRepository } from "../repository/userRepository";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { sendMessageToUser } from "./requestUserInformation";

export async function generateReport(
    userPhoneNumber: string,
    startDate: Date,
    endDate: Date
): Promise<string> {
    const user = userRepository.getUser(userPhoneNumber);
    if (!user) {
        throw new Error(`User with phone number ${userPhoneNumber} not found`);
    }

    let foodLogEntries = userRepository.getFoodLogsByDateRange(userPhoneNumber, startDate, endDate);

    if (!foodLogEntries) {
        sendMessageToUser(userPhoneNumber, "No se encontraron registros de alimentos para las fechas seleccionadas.")
        return "Se respondió al usuario correctamente.";
    }


    const description = await generateObject({
        model: openai("o3-mini"),
        schema: z.object({
            description: z.string(),
        }),
        messages: [
            { role: "system", content: `Genera un reporte de los alimentos consumidos por el usuario entre las fechas ${startDate} y ${endDate}.
                Debe tener el siguiente formato:
                - Fecha: DD/MM/YYYY
                - Media diaria de macronutrientes consumidos:
                    - Proteínas: XXg
                    - Carbohidratos: XXg
                    - Grasas: XXg
                - Media diaria de micronutrientes consumidos:
                    - Nombre del nutriente: XXmg
                - Consejo para alcanzar los objetivos nutricionales.
                # Usuario: ${user}
                # Entradas de alimentos: ${foodLogEntries}
            `}
        ]
    });

    if (!description.object.description) {
        sendMessageToUser(userPhoneNumber, "No pude generar un reporte de alimentos para las fechas seleccionadas. Por favor, intenta de nuevo.")
    } else {
        sendMessageToUser(userPhoneNumber, `El reporte de alimentos consumidos entre las fechas ${startDate} y ${endDate} es el siguiente: ${description.object.description}`);
    }

    return "Se respondió al usuario correctamente.";
}

