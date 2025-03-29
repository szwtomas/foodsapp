import express from "express";
import { use } from "../helper/utility";
import { twoChatController } from "../controller/twoChatController";
import { healthCheckController } from "../controller/healthCheckController";

const api = express.Router();

api.get("/health-check", use(healthCheckController.checkApiKey));
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
