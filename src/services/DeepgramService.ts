import { createClient, type DeepgramClient } from '@deepgram/sdk';
import { logger } from '../logger';

class DeepgramService {
  private deepgram: DeepgramClient;

	constructor() {
		this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
	}
  
  async transcribeAudio(audioUrl: string): Promise<string> {
		try {
			const { result, error } =
				await this.deepgram.listen.prerecorded.transcribeUrl(
					{ url: audioUrl },
					{
						model: "nova-2",
						smart_format: true,
						detect_language: true,
					},
				);

			if (error) {
				throw new Error(`Transcription error ${error?.message}`);
			}

			return result.results.channels[0].alternatives[0].transcript;
		} catch (error) {
			logger.error(`Audio transcription failed: ${error}`);
			throw new Error("Audio transcription failed");
		}
  }
}

export const deepgramService = new DeepgramService();
