import type { Request, Response } from "express";
import { twoChatMessenger } from "../service/TwoChatMessenger";
import type { SendMessagePayload } from "../service/types/TwoChatTypes";

export const twoChatController = {
  async checkApiKey(req: Request, res: Response): Promise<void> {
    try {
      const result = await twoChatMessenger.checkApiKey();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to check API key" });
    }
  },
  
  async getNumbers(req: Request, res: Response): Promise<void> {
    try {
      const result = await twoChatMessenger.getNumbers();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to get numbers" });
    }
  },
  
  async sendTestMessage(req: Request, res: Response): Promise<void> {
    const { to_number, message, file_url } = req.body as {
      to_number: string;
      message: string;
      file_url?: string;
    };
    
    if (!to_number || !message) {
      res.status(400).json({ error: "to_number and message are required" });
      return;
    }
    
    const from_number = process.env.TWO_CHAT_PHONE_NUMBER;
    if (!from_number) {
      res
        .status(500)
        .json({ error: "TWO_CHAT_PHONE_NUMBER is not set in the environment" });
      return;
    }
    
    try {
      const payload: SendMessagePayload = {
        to_number,
        from_number,
        text: message,
        url: file_url,
      };
      const result = await twoChatMessenger.sendMessage(payload);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to send test message. Ask the developer to check the logs for more details.",
      });
    }
  },
  
  async subscribeWebhook(req: Request, res: Response): Promise<void> {
    const { eventName, hookUrl } = req.body as {
      eventName: string;
      hookUrl: string;
    };
    
    if (!eventName || !hookUrl) {
      res.status(400).json({ error: "eventName and hookUrl are required" });
      return;
    }
    
    const onNumber = process.env.TWO_CHAT_PHONE_NUMBER;
    if (!onNumber) {
      res
        .status(500)
        .json({ error: "TWO_CHAT_PHONE_NUMBER is not set in the environment" });
      return;
    }
    
    try {
      const result = await twoChatMessenger.subscribeWebhook(
        eventName,
        hookUrl,
        onNumber,
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to subscribe to webhook. Check the logs for more details.",
      });
    }
  },
  
  async listWebhooks(req: Request, res: Response): Promise<void> {
    try {
      const result = await twoChatMessenger.listWebhooks();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: "Failed to list webhooks. Check the logs for more details.",
      });
    }
  },
  
  async deleteWebhook(req: Request, res: Response): Promise<void> {
    const { webhookUuid } = req.params;
    if (!webhookUuid) {
      res.status(400).json({ error: "webhookUuid is required" });
      return;
    }
    
    try {
      const result = await twoChatMessenger.deleteWebhook(webhookUuid);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: "Failed to delete webhook. Check the logs for more details.",
      });
    }
  },
};
