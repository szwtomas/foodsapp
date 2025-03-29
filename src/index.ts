import dotenv from "dotenv";
import OpenAIClient from "./services/openAi/openAIClient";
import OpenAIRequest from "./services/openAi/OpenAIRequest";

dotenv.config();

console.log("Hello, World!"); 

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
        const response = await client.getResponse(request);
        console.log(response);
    } catch (error) {
        console.error(error);
    }
})();