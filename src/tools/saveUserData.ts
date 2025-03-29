import { z } from "zod";
import { userRepository, UserSchema } from "../repository/userRepository";

async function saveUserData(
  user: z.infer<typeof UserSchema>
): Promise<string> {
  if (Object.values(user).some(value => value === undefined)) {
    return `campos faltantes, utiliza la tool requestUserInformation`;
  }
  userRepository.updateUser(user.phoneNumber, user);
  return `Gracias por completar tu perfil`;
}