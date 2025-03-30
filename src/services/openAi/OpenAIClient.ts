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