import { FoodLog } from "../repository/userRepository";


  export function buildFoodLogMessage(foodLog: FoodLog): string {
    return `Registraste: ${foodLog.description}  
    Contenido nutricional aproximado:  
      - ${foodLog.totalMacros.protein}g de proteínas  
      - ${foodLog.totalMacros.carbs}g de carbohidratos  
      - ${foodLog.totalMacros.fats}g de grasas  

    Alimentos registrados:  
    ${foodLog.foods.map(food => `- ${food.description}`).join("\n")}  

    Micronutrientes principales:  
    ${foodLog.totalMicros.map(micro => `- ${micro.name}: ${micro.amount}g`).join("\n")}  

    ¿Está bien así?`;
}
