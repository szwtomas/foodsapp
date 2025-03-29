import { OpenAI } from "openai";

class OpenAIClient {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    async getResponse(input: string, model: string = "gpt-4o"): Promise<String> {
        try {
            const response = await this.client.responses.create({
                model: model,
                input: input,
            });
            return response.output_text;
        } catch (error) {
            console.error(error);
            return "Error";
        }
    }
}

export default OpenAIClient;
