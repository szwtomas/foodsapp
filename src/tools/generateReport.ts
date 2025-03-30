import { generateObject } from "ai";
import { FoodLog, userRepository } from "../repository/userRepository";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { sendMessageToUser } from "./requestUserInformation";

type Goal = "loseWeight" | "gainWeight" | "maintainWeight" | "eatWholeFoods" | "eatBalanced";

type Macros = {
    protein: number;
    carbs: number;
    fats: number;
};

type Micro = {
    name: string;
    value: number;
};


const calculateAverageMacros = (foodLogEntries: FoodLog[]): Macros => {
    if (foodLogEntries.length === 0) return { protein: 0, carbs: 0, fats: 0 };

    const total = foodLogEntries.reduce(
        (acc, entry) => {
            acc.protein += entry.totalMacros.protein;
            acc.carbs += entry.totalMacros.carbs;
            acc.fats += entry.totalMacros.fats;
            return acc;
        },
        { protein: 0, carbs: 0, fats: 0 }
    );

    return {
        protein: total.protein / foodLogEntries.length,
        carbs: total.carbs / foodLogEntries.length,
        fats: total.fats / foodLogEntries.length,
    };
};

const calculateAverageMicros = (foodLogEntries: FoodLog[]): Micro[] => {
    if (foodLogEntries.length === 0) return [];

    const totalMicros: Record<string, Micro> = {};

    foodLogEntries.forEach(entry => {
        entry.totalMicros.forEach(micro => {
            if (!totalMicros[micro.name]) {
                totalMicros[micro.name] = {
                    name: micro.name,
                    value: micro.amount,
                };
            }
            totalMicros[micro.name].value += micro.amount;
        });
    });

    return Object.values(totalMicros).map(micro => ({
        ...micro,
        value: micro.value / foodLogEntries.length,
    }));
};

export async function generateReport(
    userPhoneNumber: string,
    startDate: string,
    endDate: string
): Promise<string> {
    const user = userRepository.getUser(userPhoneNumber);
    if (!user) {
        throw new Error(`User with phone number ${userPhoneNumber} not found`);
    }

    const foodLogEntries = userRepository.getFoodLogsByDateRange(
        userPhoneNumber,
        new Date(startDate),
        new Date(endDate)
    );

    if (!foodLogEntries || foodLogEntries.length === 0) {
        sendMessageToUser(userPhoneNumber, "No se encontraron registros de alimentos para las fechas seleccionadas.");
        return "Se respondió al usuario correctamente.";
    }

    const avgMacros = calculateAverageMacros(foodLogEntries);
    const avgMicros = calculateAverageMicros(foodLogEntries);

    const reportContent = `Analiza los alimentos consumidos por el usuario entre ${startDate} y ${endDate} y genera un reporte amigable y personalizado. 

    ** Hace parrafos muy breves y claros, no más de 2-3 oraciones por párrafo. **
    1. **Patrones de alimentación en este período**  
       - Destaca tendencias como aumentos o disminuciones en ciertos alimentos o nutrientes.  
       - Menciona si hay diferencias notables en el consumo en comparación con otros períodos (si es posible).  
       - Identifica posibles hábitos (ej.: "Sueles consumir más carbohidratos los fines de semana").  
    
    2. **Promedios diarios de nutrientes**  
       - **Macronutrientes**:  
         - Proteínas: ${avgMacros.protein}g  
         - Carbohidratos: ${avgMacros.carbs}g  
         - Grasas: ${avgMacros.fats}g  
       - **Micronutrientes**:  
         ${avgMicros.map(m => `- ${m.name}: ${m.value}g`).join("\n   ")}
    
    3. **Recomendaciones para mejorar tu alimentación**  
       - Basadas en los datos anteriores, sugiere cambios específicos para acercarse a los objetivos nutricionales.  
       - Si algún macronutriente o micronutriente está desbalanceado, menciona qué alimentos pueden ayudar a equilibrarlo.  
       - Mantén un tono positivo y motivador.  
    
    Información del usuario y su historial:  
    # Usuario: ${JSON.stringify(user)}  
    # Entradas de alimentos: ${JSON.stringify(foodLogEntries)}
    `;
    
    

    const description = await generateObject({
        model: openai("gpt-4o"),
        schema: z.object({ description: z.string() }),
        messages: [{ role: "system", content: reportContent }],
    });

    if (!description.object.description) {
        sendMessageToUser(userPhoneNumber, "No pude generar un reporte de alimentos para las fechas seleccionadas. Por favor, intenta de nuevo.");
    } else {
        sendMessageToUser(userPhoneNumber, `El reporte de alimentos consumidos entre las fechas ${startDate} y ${endDate} es el siguiente: ${description.object.description}`);
    }

    return "Se respondió al usuario correctamente.";
}
