import { deepgramService } from "../DeepgramService";
import dotenv from 'dotenv';
import type {
  ApiKeyCheckResponse,
  CheckNumberResponse,
  DeleteWebhookResponse,
  GetMessagesResponse,
  GetNumbersResponse,
  ListGroupParticipantsResponse,
  ListGroupsResponse,
  ListWebhooksResponse,
  SendMessagePayload,
  SendMessageResponse,
  StandardizedWebhookPayload,
  SubscribeWebhookResponse,
  WebhookPayload,
} from "../types/TwoChatTypes";
import { logger } from "../../logger";

// Ensure environment variables are loaded
dotenv.config();

export class TwoChatMessenger {
  private apiKey: string;
  private baseUrl = "https://api.p.2chat.io/open";
  private logger;

  constructor(apiKey: string, logger: any) {
    if (!apiKey) {
      throw new Error("API Key is required for TwoChatMessenger");
    }
    this.apiKey = apiKey;
    this.logger = logger;
  }

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      "X-User-API-Key": this.apiKey,
    };
  }

  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: this.getHeaders(),
      });
      const data = await response.json();
      if (!response.ok) {
        const errorMsg = (data.detail || data.error_message) ?? "Unknown error";
        this.logger.error(`API Error: ${errorMsg}`);
        throw new Error(errorMsg);
      }
      return data as T;
    } catch (error) {
      this.logger.error(
        `Request failed: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  async checkApiKey(): Promise<ApiKeyCheckResponse> {
    return this.request<ApiKeyCheckResponse>("/info/", {
      method: "GET",
    });
  }

  async listWebhooks(): Promise<ListWebhooksResponse> {
    return this.request<ListWebhooksResponse>("/webhooks", {
      method: "GET",
    });
  }

  async subscribeWebhook(
    eventName: string,
    hookUrl: string,
    onNumber: string,
  ): Promise<SubscribeWebhookResponse> {
    return this.request<SubscribeWebhookResponse>(
      `/webhooks/subscribe/${encodeURIComponent(eventName)}`,
      {
        method: "POST",
        body: JSON.stringify({ hook_url: hookUrl, on_number: onNumber }),
      },
    );
  }

  async deleteWebhook(webhookUuid: string): Promise<DeleteWebhookResponse> {
    return this.request<DeleteWebhookResponse>(
      `/webhooks/${encodeURIComponent(webhookUuid)}`,
      {
        method: "DELETE",
      },
    );
  }

  async getNumbers(): Promise<GetNumbersResponse> {
    return this.request<GetNumbersResponse>("/whatsapp/get-numbers", {
      method: "GET",
    });
  }

  async listGroups(): Promise<ListGroupsResponse> {
    return this.request<ListGroupsResponse>("/whatsapp/groups/", {
      method: "GET",
    });
  }

  async listGroupParticipants(
    groupUuid: string,
  ): Promise<ListGroupParticipantsResponse> {
    return this.request<ListGroupParticipantsResponse>(
      `/whatsapp/group/${encodeURIComponent(groupUuid)}`,
      {
        method: "GET",
      },
    );
  }

  async checkNumberInWhatsapp(
    phoneNumber: string,
  ): Promise<CheckNumberResponse> {
    const encodedNumber = encodeURIComponent(phoneNumber);
    return this.request<CheckNumberResponse>(
      `/whatsapp/check-number/${encodedNumber}`,
      {
        method: "GET",
      },
    );
  }

  async getMessages(): Promise<GetMessagesResponse> {
    return this.request<GetMessagesResponse>("/whatsapp/messages/", {
      method: "GET",
    });
  }

  async sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
    return this.request<SendMessageResponse>("/whatsapp/send-message", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async processWebhookPayload(
    payload: WebhookPayload,
  ): Promise<StandardizedWebhookPayload> {
    const requiredKeys = [
      "uuid",
      "created_at",
      "remote_phone_number",
      "message",
    ];
    for (const key of requiredKeys) {
      if (!(key in payload)) {
        throw new Error(`Invalid payload: missing required key '${key}'`);
      }
    }

    const standardizedPayload: StandardizedWebhookPayload = {
      type: payload.message.text
        ? "text"
        : (payload.message.media?.type as
            | "image"
            | "audio"
            | "video"
            | "file"
            | "ptt") ?? "other",
      messageId: payload.uuid,
      timestamp: payload.created_at,
      from: payload.remote_phone_number,
      to: payload.channel_phone_number || "",
      content: {},
    };

    if (payload.message.text) {
      standardizedPayload.content.text = payload.message.text;
    }

    if (payload.message.media) {
      standardizedPayload.content.media = {
        type: payload.message.media.type,
        url: payload.message.media.url,
        mimeType: payload.message.media.mime_type,
      };

      if (
        payload.message.media.type === "ptt" ||
        payload.message.media.type === "audio"
      ) {
        try {
          standardizedPayload.content.text =
            await deepgramService.transcribeAudio(payload.message.media.url);
          this.logger.info(
            { text: standardizedPayload.content.text },
            "TRANSCRIBED AUDIO",
          );
        } catch (error) {
          this.logger.error(`Audio transcription failed: ${error}`);
          standardizedPayload.content.text = "Audio transcription failed";
        }
      }
    }

    if (payload.contact) {
      standardizedPayload.senderInfo = {
        name:
          payload.contact.friendly_name ||
          `${payload.contact.first_name || ""} ${payload.contact.last_name || ""}`.trim() ||
          undefined,
        profilePicUrl: payload.contact.profile_pic_url || undefined,
        device: payload.contact.device,
      };
    }

    this.logger.info(standardizedPayload, "Standardized webhook payload");
    return standardizedPayload;
  }
}

export const twoChatMessenger = new TwoChatMessenger(
  process.env.TWO_CHAT_API_KEY ?? "",
  logger
);
