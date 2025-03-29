import dotenv from "dotenv";
import OpenAIClient from "./services/openAi/openAIClient";
import OpenAIRequest from "./services/openAi/OpenAIRequest";

dotenv.config();

console.log("Hello, World!"); 

(async () => {
    const apiKey = process.env.OPENAI_API_KEY || "your-api-key-here";
    const client = new OpenAIClient();
    
    const openAIRequest: OpenAIRequest = {
        model: "gpt-3.5-turbo",
        input: "Hello, GPT!",
        instructions: "Please respond to the given input."
    };
    try {
        const response = await client.getResponse(openAIRequest);
        console.log(response);
    } catch (error) {
        console.error(error);
    }
})();