import dotenv from "dotenv";
import OpenAIClient from "./services/openAi/openAiClient";

dotenv.config();

console.log("Hello, World!"); 

(async () => {
    const apiKey = process.env.OPENAI_API_KEY || "your-api-key-here";
    const client = new OpenAIClient();
    
    
    try {
        const response = await client.getResponse("hola gpt!");
        console.log(response);
    } catch (error) {
        console.error(error);
    }
})();