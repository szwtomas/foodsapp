import { OpenAI } from "openai";
import OpenAiRequest from "./OpenAIRequest";

class OpenAIClient {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    
    async getResponse(request: any): Promise<String> {
        try {
            const response = await this.client.responses.create({
                model: request.model,
                input: request.input.map((input: any) => ({
                    role: input.role,
                    content: input.content.map((content: any) => ({
                        type: content.type,
                        image_url: content.image_url,
                        text: content.text,
                    })),
                })),
                instructions: request.instructions,
            });
            console.log(response);
            return response.output_text;
        } catch (error) {
            console.error(error);
            return "Error";
        }
    }
}

export default OpenAIClient;
