import { userRepository } from "../repository/userRepository";
import { sendMessageToUser } from "./requestUserInformation";

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
  return `Gracias por registrar tu consumo de ${lastPendingFoodLogEntry.description} ✅  `; // TODO NTH: insight about food
}