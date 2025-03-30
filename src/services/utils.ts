import { FoodLog } from "../repository/userRepository";


  export function buildFoodLogMessage(foodLog: FoodLog): string {
    return `
Registraste: ${foodLog.description}  
Contenido nutricional aproximado: \n* ${foodLog.totalMacros.protein}g de proteínas\n* ${foodLog.totalMacros.carbs}g de carbohidratos\n* ${foodLog.totalMacros.fats}g de grasas  

Alimentos registrados: \n${foodLog.foods.map(food => `* ${food.description}`).join("\n")}  

Micronutrientes: \n${foodLog.totalMicros.length > 0 
        ? foodLog.totalMicros.map(micro => `* ${micro.name}: ${micro.amount}g`).join("\n") 
        : "  * No se registraron micronutrientes"}  
      

¿Está bien así?`;
}
