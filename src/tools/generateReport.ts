import { generateObject } from "ai";
import { userRepository } from "../repository/userRepository";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { sendMessageToUser } from "./requestUserInformation";

export async function generateReport(
    userPhoneNumber: string,
    startDate: string,
    endDate: string
): Promise<string> {
    const user = userRepository.getUser(userPhoneNumber);
    if (!user) {
        throw new Error(`User with phone number ${userPhoneNumber} not found`);
    }

    let foodLogEntries = userRepository.getFoodLogsByDateRange(userPhoneNumber, new Date(startDate), new Date(endDate));


    // let foodLogEntries = [
    //     {
    //         date: "2022-01-01",
    //         food: "Arroz",
    //         quantity: "200g",
    //         calories: 200,
    //         protein: 10,
    //         carbohydrates: 40,
    //         fats: 5,
    //         fiber: 2,
    //         sugar: 5
    //     },
    //     {
    //         date: "2022-01-01",
    //         food: "Pollo",
    //         quantity: "150g",
    //         calories: 200,
    //         protein: 20,
    //         carbohydrates: 0,
    //         fats: 10,
    //         fiber: 0,
    //         sugar: 0
    //     },
    //     {
    //         date: "2022-01-02",
    //         food: "Pescado",
    //         quantity: "200g",
    //         calories: 200,
    //         protein: 20,
    //         carbohydrates: 0,
    //         fats: 10,
    //         fiber: 0,
    //         sugar: 0
    //     },
    //     {
    //         date: "2022-01-02",
    //         food: "Ensalada",
    //         quantity: "100g",
    //         calories: 50,
    //         protein: 2,
    //         carbohydrates: 10,
    //         fats: 0,
    //         fiber: 5,
    //         sugar: 5
    //     }
    // ];

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
                # Fecha de hoy: ${new Date().toLocaleDateString()}
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

