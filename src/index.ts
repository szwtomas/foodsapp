import express from "express";
import dotenv from "dotenv";
import api from "./routes/api";
import webhookRouter from "./routes/webhook";
// import OpenAIClient from "./services/openAi/OpenAIClient";
import OpenAIRequest from "./services/openAi/OpenAIRequest";

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

// (async () => {
//     const apiKey = process.env.OPENAI_API_KEY || "your-api-key-here";
//     const client = new OpenAIClient();
//     const request: OpenAIRequest = {
//         model: "gpt-4o-mini",
//         input: [
//             {
//                 role: "user",
//                 content: [
//                     // { type: "text", text: "What can you see in the image?" },
//                     // { type: "image", image: new URL("https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFUAfyVe3Easiycyh3isP9wDQTYuSmGPsPQvLIJdEYvQ_DsFq5Ez2Nh_QjiS3oZ3B8ZPfK9cZQyIStmQMV1lDPLw") },
//                     { type: "input_audio", audio_url: "https://www.pacdv.com/sounds/voices/you-can-do-it.wav" }
//                 ]
//             }
//         ],
//         instructions: "Habla como un pirata."
//     };
//     try {
//         const response = await client.getResponse(request);
//         // const audio = await client.transcriptAudio("https://www.pacdv.com/sounds/voices/you-can-do-it.wav");
//         console.log("HOLA")
//         console.log(response);
//     } catch (error) {
//         console.error(error);
//     }
// })();
