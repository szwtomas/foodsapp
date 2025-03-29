import type { Request, Response } from "express";
import { logger } from "../logger";
import { twoChatMessenger } from "../services/twochat/TwoChatMessenger";
import type { StandardizedWebhookPayload } from "../services/types/TwoChatTypes";

export async function receiveWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { body } = req;
    
    // Process the webhook payload
    const payload = await twoChatMessenger.processWebhookPayload(body);
    
    // Check if it's a message read event
    if ("event" in payload && payload.event === "message.read") {
      logger.info({ payload }, "Message read event");
      res.status(200).send({ message: "Message read event processed" });
      return;
    }
    
    // Cast to StandardizedWebhookPayload and extract relevant data
    const standardizedPayload = payload as StandardizedWebhookPayload;
    const userPhoneNumber = standardizedPayload.from;
    const fromNumber = process.env.TWO_CHAT_PHONE_NUMBER || "";
    
    logger.info({
      from: userPhoneNumber,
      messageType: standardizedPayload.type,
      messageId: standardizedPayload.messageId
    }, "Received message");
    
    // Respond with "hola" to any incoming message
    await twoChatMessenger.sendMessage({
      to_number: userPhoneNumber,
      from_number: fromNumber,
      text: "hola"
    });
    
    res.status(200).send({ message: "Webhook processed successfully" });
  } catch (error) {
    logger.error(error, `Error processing webhook`);
    res.status(500).send({ message: "An error occurred while processing webhook" });
  }
}
