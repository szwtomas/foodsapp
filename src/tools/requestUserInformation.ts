import type { User } from "../repository/userRepository";

export async function executeRequestUserInformationTool({user}: {user: User}) {
    console.log("user is", user)
  return "info pedida, terminaste";
}