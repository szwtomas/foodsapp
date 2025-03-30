import { z } from "zod";

// Ensure TypeScript recognizes the ZodError type
type ZodErrorType = z.ZodError;

// Zod schemas
const MacrosSchema = z.object({
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fats: z.number().nonnegative(),
});

const MicroSchema = z.object({
  name: z.string().min(1),
  amount: z.number().nonnegative(),
});

const FoodSchema = z.object({
  description: z.string().min(1),
  macros: MacrosSchema,
  micros: z.array(MicroSchema),
});

const FoodLogSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  totalMacros: MacrosSchema,
  totalMicros: z.array(MicroSchema),
  foods: z.array(FoodSchema),
  date: z.date(),
  status: z.enum(["pending", "validated"]),
});

const MessageSchema = z.object({
  content: z.string().min(1),
  timestamp: z.date(),
  isUser: z.boolean(),
});

export const UserSchema = z.object({
  age: z.number().int().positive().optional(),
  phoneNumber: z.string().min(5), // ID
  name: z.string().min(1).optional(),
  goal: z
    .array(
      z
        .enum([
          "loseWeight",
          "gainWeight",
          "maintainWeight",
          "eatWholeFoods",
          "eatBalanced",
        ])
        .optional()
    )
    .optional(),
  sex: z.enum(["male", "female", "other"]).optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  physicalActivityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "veryActive"])
    .optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  diseases: z.array(z.string()).optional(),
  conversation: z.array(MessageSchema).optional(),
  foodLogs: z.array(FoodLogSchema).optional(),
});

// Type definitions derived from Zod schemas
type Macros = z.infer<typeof MacrosSchema>;
type Micro = z.infer<typeof MicroSchema>;
type Food = z.infer<typeof FoodSchema>;
export type FoodLog = z.infer<typeof FoodLogSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type User = z.infer<typeof UserSchema>;

export class UserRepository {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  // Create a new user
  createUser(userData: User): User {
    try {
      // Validate the input data
      const validatedData = UserSchema.parse(userData);

      const newUser: User = {
        ...validatedData,
        conversation: [],
      };
      this.users.set(validatedData.phoneNumber, newUser);
      return newUser;
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

  // Get user by phone number
  getUser(phoneNumber: string): User | undefined {
    return this.users.get(phoneNumber);
  }

  createUserFromNumber(phoneNumber: string): User {
    const user = this.createUser({ phoneNumber });
    console.log("saved", user);
    return user;
  }

  // Update user
  updateUser(
    phoneNumber: string,
    updates: Partial<Omit<User, "phoneNumber">>
  ): User | undefined {
    const user = this.users.get(phoneNumber);
    if (!user) return undefined;

    try {
      // Validate the updates
      const validatedUpdates = UserSchema.partial()
        .omit({ phoneNumber: true })
        .parse(updates);

      const updatedUser: User = {
        ...user,
        ...validatedUpdates,
      };

      // Validate the complete user object
      UserSchema.parse(updatedUser);

      this.users.set(phoneNumber, updatedUser);
      return updatedUser;
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

  // Delete user
  deleteUser(phoneNumber: string): boolean {
    return this.users.delete(phoneNumber);
  }

  // Add message to user's conversation
  addMessage(
    phoneNumber: string,
    messageData: Omit<Message, "timestamp">
  ): Message | undefined {
    const user = this.users.get(phoneNumber);
    if (!user) return undefined;

    try {
      // Validate the message data
      const validatedData = MessageSchema.omit({ timestamp: true }).parse(
        messageData
      );

      const newMessage: Message = {
        ...validatedData,
        timestamp: new Date(),
      };

      if (!user.conversation) {
        user.conversation = [];
      }

      user.conversation.push(newMessage);
      return newMessage;
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

  // Get user's conversation
  getConversation(phoneNumber: string): Message[] | undefined {
    const user = this.users.get(phoneNumber);
    return user?.conversation;
  }

  // Get all users
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  // Clear all users (useful for testing)
  clear(): void {
    this.users.clear();
  }

  // Add a food log to user
  addFoodLog(
    phoneNumber: string,
    foodLogData: Omit<FoodLog, "date">
  ): FoodLog | undefined {
    const user = this.users.get(phoneNumber);
    if (!user) return undefined;

    try {
      // Validate the food log data
      const validatedData = FoodLogSchema.omit({ date: true }).parse(
        foodLogData
      );

      const newFoodLog: FoodLog = {
        ...validatedData,
        date: new Date(),
      };

      if (!user.foodLogs) {
        user.foodLogs = [];
      }

      user.foodLogs.push(newFoodLog);
      return newFoodLog;
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

  // Get all food logs for a user
  getFoodLogs(phoneNumber: string): FoodLog[] | undefined {
    const user = this.users.get(phoneNumber);
    return user?.foodLogs;
  }

  getLastPendingFoodLogEntry(phoneNumber: string): FoodLog | undefined {
    const user = this.users.get(phoneNumber);
    return user?.foodLogs
      ?.filter((log) => log.status === "pending")
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  }

  // Get a specific food log by index
  getFoodLogByIndex(phoneNumber: string, index: number): FoodLog | undefined {
    const foodLogs = this.getFoodLogs(phoneNumber);
    if (!foodLogs || index < 0 || index >= foodLogs.length) return undefined;
    return foodLogs[index];
  }

  // Get food logs for a specific date range
  getFoodLogsByDateRange(
    phoneNumber: string,
    startDate: Date,
    endDate: Date
  ): FoodLog[] | undefined {
    const foodLogs = this.getFoodLogs(phoneNumber);
    if (!foodLogs) return undefined;

    return foodLogs.filter((log) => {
      return log.date >= startDate && log.date <= endDate;
    });
  }

  // Update a food log
  updateFoodLog(
    phoneNumber: string,
    id: string,
    updates: Partial<Omit<FoodLog, "date">>
  ): FoodLog | undefined {
    const user = this.users.get(phoneNumber);
    if (!user || !user.foodLogs) return undefined;

    try {
      // Validate the updates
      const validatedUpdates = FoodLogSchema.partial()
        .omit({ date: true })
        .parse(updates);

      // Find the food log and create updated version
      const foodLog = user.foodLogs.find((log) => log.id === id);
      if (!foodLog) return undefined;

      const updatedFoodLog: FoodLog = {
        ...foodLog,
        ...validatedUpdates,
      };

      // Validate the complete food log object
      FoodLogSchema.parse(updatedFoodLog);

      user.foodLogs[user.foodLogs.findIndex((log) => log.id === id)] =
        updatedFoodLog;
      return updatedFoodLog;
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

  // Delete a food log
  deleteFoodLog(phoneNumber: string, id: string): boolean {
    const user = this.users.get(phoneNumber);
    if (!user || !user.foodLogs || !user.foodLogs.find((log) => log.id === id))
      return false;

    user.foodLogs.splice(
      user.foodLogs.findIndex((log) => log.id === id),
      1
    );
    return true;
  }

  // Add a food to a specific food log
  addFoodToFoodLog(
    phoneNumber: string,
    id: string,
    foodData: Food
  ): Food | undefined {
    const user = this.users.get(phoneNumber);
    if (!user || !user.foodLogs || !user.foodLogs.find((log) => log.id === id))
      return undefined;

    try {
      // Validate the food data
      const validatedFood = FoodSchema.parse(foodData);

      const foodLog = user.foodLogs.find((log) => log.id === id);
      if (!foodLog) return undefined;
      foodLog.foods.push(validatedFood);

      // Recalculate total macros
      foodLog.totalMacros = this.calculateTotalMacros(foodLog.foods);
      // Recalculate total micros
      foodLog.totalMicros = this.calculateTotalMicros(foodLog.foods);

      return validatedFood;
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

  // Helper method to calculate total macros from a list of foods
  private calculateTotalMacros(foods: Food[]): Macros {
    return foods.reduce(
      (total, food) => {
        return {
          protein: total.protein + food.macros.protein,
          carbs: total.carbs + food.macros.carbs,
          fats: total.fats + food.macros.fats,
        };
      },
      { protein: 0, carbs: 0, fats: 0 }
    );
  }

  // Helper method to calculate total micros from a list of foods
  private calculateTotalMicros(foods: Food[]): Micro[] {
    // Create a map to aggregate micros by name
    const microMap = new Map<string, number>();
    // Aggregate all micros from all foods
    for (const food of foods) {
      for (const micro of food.micros) {
        const currentAmount = microMap.get(micro.name) || 0;
        microMap.set(micro.name, currentAmount + micro.amount);
      }
    }

    // Convert map back to array of Micro objects
    return Array.from(microMap.entries()).map(([name, amount]) => ({
      name,
      amount,
    }));
  }
}

export const userRepository = new UserRepository();
