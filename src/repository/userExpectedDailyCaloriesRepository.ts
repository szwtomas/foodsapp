import { z } from "zod";
import { userRepository } from "./userRepository";

// Zod schema for UserExpectedDailyCalories
export const UserExpectedDailyCaloriesSchema = z.object({
  phoneNumber: z.string().min(5),
  dailyCaloriesNumber: z.number().positive(),
});

function calculateCalories(
    weightKg: number,
    heightCm: number,
    isMan: boolean,
    activityLevel: "sedentary" | "light" | "moderate" | "active" | "veryActive" | ""
  ): { maintenance: number, weightLoss: number, weightGain: number } {
    const bmr = isMan
      ? 88.36 + 13.4 * weightKg + 4.8 * heightCm - 5.7 * 30 // assuming age 30
      : 447.6 + 9.2 * weightKg + 3.1 * heightCm - 4.3 * 30; // assuming age 30
  
    let activityMultiplier: number;
    if (activityLevel === "sedentary") {
      activityMultiplier = 1.2;
    } else if (activityLevel === "light") {
      activityMultiplier = 1.375;
    } else if (activityLevel === "moderate") {
      activityMultiplier = 1.55;
    } else if (activityLevel === "active") {
      activityMultiplier = 1.725;
    } else if (activityLevel === "veryActive") {
      activityMultiplier = 1.9;
    } else if (activityLevel === "") {
      throw new Error("Invalid activity level");
    } else {
        throw new Error("Invalid activity level");
    }
  
    const maintenanceCalories = bmr * activityMultiplier;
    const weightLossCalories = maintenanceCalories - 500;
    const weightGainCalories = maintenanceCalories + 500;
  
    return {
      maintenance: Math.round(maintenanceCalories),
      weightLoss: Math.round(weightLossCalories),
      weightGain: Math.round(weightGainCalories),
    };
  }
  

// Type definition derived from Zod schema
export type UserExpectedDailyCalories = z.infer<typeof UserExpectedDailyCaloriesSchema>;

export class UserExpectedDailyCaloriesRepository {
  private entries: Map<string, UserExpectedDailyCalories>;

  constructor() {
    this.entries = new Map();
  }

  addEntry(phone: string) {
    try {
        const user = userRepository.getUser(phone);

        const calories = calculateCalories(
            user?.weight ?? 75,
            user?.height ?? 170,
            user?.sex === "male",
            user?.physicalActivityLevel ?? "light"
        );

        let actualCalores: number;
        if (user?.goal?.includes("loseWeight")) {
            actualCalores = calories.weightLoss;
        } else if (user?.goal?.includes("gainWeight")) {
            actualCalores = calories.weightGain;
        } else {
            actualCalores = calories.maintenance;
        }
        
        this.entries.set(phone, {
            phoneNumber: phone,
            dailyCaloriesNumber: actualCalores,
        });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation error: ${error.errors
            .map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`)
            .join(", ")}`
        );
      }
      throw error;
    }
  }

  // Get entry by phone number
  getEntry(phoneNumber: string): UserExpectedDailyCalories | undefined {
    return this.entries.get(phoneNumber);
  }

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  getAll(): any {
    return Array.from(this.entries.values());
  }

  // Clear all entries (useful for testing)
  clear(): void {
    this.entries.clear();
  }
}

export const userExpectedDailyCaloriesRepository = new UserExpectedDailyCaloriesRepository(); 