import express from "express";
import dotenv from "dotenv";
import OpenAIClient from "./services/openAi/OpenAIClient";
import type OpenAIRequest from "./services/openAi/OpenAIRequest";
import api from "./routes/api";
import webhookRouter from "./routes/webhook";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use(api);
app.use(webhookRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

(async () => {
    const apiKey = process.env.OPENAI_API_KEY || "your-api-key-here";
    const client = new OpenAIClient();
    const request: OpenAIRequest = {
        model: "gpt-4o-mini",
        input: [
            {
                role: "user",
                content: [
                    { type: "input_text", text: "What can you see in the image?" },
                    { type: "input_image", image_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFUAfyVe3Easiycyh3isP9wDQTYuSmGPsPQvLIJdEYvQ_DsFq5Ez2Nh_QjiS3oZ3B8ZPfK9cZQyIStmQMV1lDPLw", detail: "high" }
                ]
            }
        ],
        instructions: "Habla como un pirata."
    };
    try {
        // const response = await client.getResponse(request);
        const audio = await client.transcriptAudio("https://www.pacdv.com/sounds/voices/you-can-do-it.wav");
        console.log(audio);
    } catch (error) {
        console.error(error);
    }
})();