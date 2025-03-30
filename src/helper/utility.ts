import type { Request, Response, NextFunction } from 'express';
import { twoChatMessenger } from '../services/twochat/TwoChatMessenger';
import { userRepository } from '../repository/userRepository';

// Utility function to handle async route handlers
export const use = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export async function sendAssistantMessageAndAddToConversation(phoneNumber: string, message: string) {

  console.log(`About to send message to user ${phoneNumber} content ${message}`);

  await twoChatMessenger.sendMessage({
    to_number: phoneNumber,
    from_number: process.env.TWO_CHAT_PHONE_NUMBER || "",
    text: message,
  });

  userRepository.addMessage(phoneNumber, {
    content: { text: message },
    sender: "assistant",
  });

  console.log(
    `Sent message ${message} to ${phoneNumber} from ${process.env.TWO_CHAT_PHONE_NUMBER}`
  );
}