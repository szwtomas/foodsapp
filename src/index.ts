import express from "express";
import dotenv from "dotenv";
import api from "./routes/api";
import webhookRouter from "./routes/webhook";
import { userRepository } from "./repository/userRepository";

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


userRepository.createUser({
  phoneNumber: "+5491137050745",
  name: "Gabriel",
  age: 35,
  goal: ["loseWeight"],
  sex: "male",
  height: 185, // cm
  weight: 80, // kg
  physicalActivityLevel: "moderate",
  dietaryRestrictions: ["lactose", "gluten"],
  diseases: ["hypertension"],
  conversation: [
    {
      content: { text: "Hola, quiero registrar mi comida" },
      timestamp: new Date(Date.now()),
      sender: "user"
    },
    {
      content: { text: "¡Hola! Claro, puedes decirme qué comiste y te ayudaré a registrarlo." },
      timestamp: new Date(Date.now()),
      sender: "assistant"
    }
  ],
  foodLogs: [
    // {
    //   id: "1",
    //   description: "Desayuno saludable",
    //   totalMacros: {
    //     protein: 15,
    //     carbs: 30,
    //     fats: 10
    //   },
    //   totalMicros: [
    //     { name: "Vitamin C", amount: 45 },
    //     { name: "Calcium", amount: 200 }
    //   ],
    //   foods: [
    //     {
    //       description: "Avena con leche de almendras",
    //       macros: {
    //         protein: 5,
    //         carbs: 20,
    //         fats: 3
    //       },
    //       micros: [
    //         { name: "Iron", amount: 2 }
    //       ]
    //     },
    //     {
    //       description: "Banana",
    //       macros: {
    //         protein: 1,
    //         carbs: 23,
    //         fats: 0
    //       },
    //       micros: [
    //         { name: "Potassium", amount: 400 }
    //       ]
    //     }
    //   ],
    //   date: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
    //   status: "validated"
    // },
    // {
    //   id: "2",
    //   description: "Almuerzo proteico",
    //   totalMacros: {
    //     protein: 35,
    //     carbs: 45,
    //     fats: 15
    //   },
    //   totalMicros: [
    //     { name: "Vitamin B12", amount: 2.4 },
    //     { name: "Zinc", amount: 8 }
    //   ],
    //   foods: [
    //     {
    //       description: "Pechuga de pollo a la plancha",
    //       macros: {
    //         protein: 30,
    //         carbs: 0,
    //         fats: 5
    //       },
    //       micros: [
    //         { name: "Vitamin B6", amount: 0.5 }
    //       ]
    //     },
    //     {
    //       description: "Ensalada de quinoa",
    //       macros: {
    //         protein: 5,
    //         carbs: 45,
    //         fats: 10
    //       },
    //       micros: [
    //         { name: "Magnesium", amount: 80 }
    //       ]
    //     }
    //   ],
    //   date: new Date(), // today
    //   status: "pending"
    // }
  ]
})