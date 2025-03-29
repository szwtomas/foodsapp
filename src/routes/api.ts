import express from "express";
import { twoChatController } from "../controller/twoChatController";
import { use } from "../helper/utility";

const api = express.Router();

api.get("/api/twochat/check", use(twoChatController.checkApiKey));
api.get("/api/twochat/numbers", use(twoChatController.getNumbers));
api.post(
  "/api/twochat/send-test-message",
  use(twoChatController.sendTestMessage),
);
api.post("/api/twochat/webhook", use(twoChatController.subscribeWebhook));
api.get("/api/twochat/webhook", use(twoChatController.listWebhooks));
api.delete(
  "/api/twochat/webhook/:webhookUuid",
  use(twoChatController.deleteWebhook),
);

export default api;
