import OpenAI, { toFile } from 'openai';
import type OpenAIRequest from "./OpenAIRequest";
import { z } from "zod";


import { openai } from '@ai-sdk/openai';
import { generateObject, generateText } from 'ai';

const CalendarEvent = z.object({
    description: z.string(),
});



class OpenAIClient {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }


    async getResponse(request: OpenAIRequest): Promise<string> {
        try {
            const processedInputs = await Promise.all(
                request.input.map(async ({ role, content }) => ({
                    role,
                    content: await this.processContent(content)
                }))
            );

            const result = await generateText({
                model: openai('gpt-4-turbo'),
                messages: processedInputs,
            });

            // console.log(JSON.stringify(result, null, 2));
            return result.text;
        } catch (error) {
            console.error(error);
            return "Error";
        }
    }

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    private async processContent(content: any[]): Promise<any[]> {
        return Promise.all(content.map(async (item) => {
            if (item.type === "input_audio" && item.audio_url) {
                return { type: "text", text: await this.transcriptAudio(item.audio_url) };
            }
            return item;
        }));
    }

    async transcriptAudio(url: string): Promise<string> {
        try {
            const response = await fetch(url);
            const transcription = await this.client.audio.transcriptions.create({
                file: await toFile(response, 'File.ogg'),
                model: "whisper-1"
            });
            return transcription?.text || "";
        } catch (error) {
            console.error(error);
            return "Error";
        }
    }
}

export const openAiClient = new OpenAIClient();