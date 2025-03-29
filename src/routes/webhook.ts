import express from "express";
import { receiveWebhook } from "../controller/webhookController";
import { use } from "../helper/utility";

const webhookRouter = express.Router();

// Route for receiving webhook events
webhookRouter.post("/api/webhook", use(receiveWebhook));

export default webhookRouter;
