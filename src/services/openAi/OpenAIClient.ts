import { OpenAI } from "openai";
import OpenAiRequest from "./OpenAIRequest";
import OpenAIRequest from "./OpenAIRequest";

class OpenAIClient {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    
    async getResponse(request: OpenAIRequest): Promise<String> {
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

    // async fetchAndConvertAudio(request: OpenAIRequest): Promise<String> {
    //     const url = "https://cdn.openai.com/API/docs/audio/alloy.wav";
    //     const audioResponse = await fetch(url);
    //     const buffer = await audioResponse.arrayBuffer();
    //     const base64str = Buffer.from(buffer).toString("base64");
      
    //     const response = await this.client.chat.completions.create({
    //       model: "gpt-4o-audio-preview",
    //       modalities: ["text", "audio"],
    //       audio: { voice: "alloy", format: "wav" },
    //       messages: [
    //         {
    //           role: "user",
    //           content: [
    //             { type: "text", text: "What is in this recording?" },
    //             { type: "input_audio", input_audio: { data: base64str, format: "wav" } },
    //           ],
    //         },
    //       ],
    //       store: true,
    //     });
      
    //     console.log(response.choices[0]);
    //   }
}

export default OpenAIClient;
