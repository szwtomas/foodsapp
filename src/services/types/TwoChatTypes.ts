export interface ApiKeyCheckSuccess {
  success: true;
  account: {
    name: string;
    uuid: string;
    on_trial: boolean;
    blocked: boolean;
    block_reason: string | null;
    created_at: string;
    expires_at: string;
  };
  limits: {
    requests_per_minute: number;
  };
}

export interface ApiKeyCheckError {
  detail: string;
}

export type ApiKeyCheckResponse = ApiKeyCheckSuccess | ApiKeyCheckError;

export interface Webhook {
  uuid: string;
  event_name: string;
  channel_uuid: string;
  hook_url: string;
  id: number;
  account_id: number;
  created_at: string;
  hook_params: {
    waweb_uuid: string;
  };
}

export interface ListWebhooksSuccess {
  success: true;
  webhooks: Webhook[];
}

export interface ListWebhooksError {
  detail?: string;
  error_message?: string;
}

export type ListWebhooksResponse = ListWebhooksSuccess | ListWebhooksError;

export interface SubscribeWebhookError {
  error_message: string;
  error: boolean;
}

export interface SubscribeWebhookSuccess {
  success: true;
  data: {
    uuid: string;
    event_name: string;
    channel_uuid: string;
    hook_url: string;
    hook_params: {
      waweb_uuid: string;
    };
    created_at: string;
  };
}

export type SubscribeWebhookResponse =
  | SubscribeWebhookSuccess
  | SubscribeWebhookError;

export interface DeleteWebhookSuccess {
  success: true;
}

export interface DeleteWebhookError {
  detail?: string;
  error_message?: string;
}

export type DeleteWebhookResponse = DeleteWebhookSuccess | DeleteWebhookError;

export interface NumberInfo {
  uuid: string;
  friendly_name: string;
  phone_number: string;
  iso_country_code: string;
  pushname: string | null;
  server: string;
  platform: string;
  connection_status: string;
  enabled: boolean;
  is_business_profile: boolean;
  channel_type: string;
  sync_contacts: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetNumbersSuccess {
  success: true;
  numbers: NumberInfo[];
}

export interface GetNumbersError {
  detail?: string;
  error_message?: string;
}

export type GetNumbersResponse = GetNumbersSuccess | GetNumbersError;

export interface Group {
  uuid: string;
  channel_uuid: string;
  wa_group_id: string;
  profile_pic_url: string;
  wa_owner_id: string;
  wa_group_name: string;
  wa_created_at: string;
  wa_subject: string;
  size: number;
  is_muted: boolean;
  is_read_only: boolean;
  channel_is_owner: boolean;
  created_at: string;
  updated_at: string;
  owner_contact: {
    uuid: string;
    first_name: string;
    last_name: string;
    channel_uuid: string;
    profile_pic_url: string | null;
  };
}

export interface ListGroupsSuccess {
  success: true;
  data: Group[];
}

export interface ListGroupsError {
  detail: string;
}

export type ListGroupsResponse = ListGroupsSuccess | ListGroupsError;

export interface Participant {
  wa_participant_id: string;
  wa_pushname: string | null;
  profile_pic_url: string | null;
  wa_is_super_admin: boolean;
  wa_is_admin: boolean;
  device: string | null;
  created_at: string;
  updated_at: string;
  contact?: {
    uuid: string;
    first_name: string;
    last_name: string;
    channel_uuid: string | null;
    profile_pic_url: string | null;
  };
  phone_number: string;
  formatted_phone_number: string;
  iso_country_code: string;
}

export interface OwnerData {
  phone_number: string;
  formatted_phone_number: string;
  iso_country_code: string;
}

export interface GroupInfo {
  uuid: string;
  channel_uuid: string;
  wa_group_id: string;
  profile_pic_url: string;
  wa_owner_id: string;
  wa_group_name: string;
  wa_created_at: string;
  wa_subject: string;
  size: number;
  is_muted: boolean;
  is_read_only: boolean;
  channel_is_owner: boolean;
  created_at: string;
  updated_at: string;
  owner_contact: {
    uuid: string;
    first_name: string;
    last_name: string;
    channel_uuid: string;
    profile_pic_url: string | null;
  };
  owner_data: OwnerData;
  participants: Participant[];
}

export interface ListGroupParticipantsSuccess {
  success: true;
  data: GroupInfo;
}

export interface ListGroupParticipantsError {
  detail: string;
}

export type ListGroupParticipantsResponse =
  | ListGroupParticipantsSuccess
  | ListGroupParticipantsError;

export interface CheckNumberSuccess {
  is_valid: boolean;
  number: {
    iso_country_code: string;
    region: string;
    carrier: string;
    timezone: string[];
  };
  on_whatsapp: boolean;
  whatsapp_info?: {
    is_business: boolean;
    is_enterprise: boolean;
    profile_pic: string;
    verified_level: number;
    verified_name: string;
  };
}

export interface CheckNumberError {
  detail: string;
}

export type CheckNumberResponse = CheckNumberSuccess | CheckNumberError;

export interface MessageMedia {
  url: string;
  type: string;
  mime_type: string;
}

export interface MessageContent {
  media?: MessageMedia;
  text?: string;
}

export interface Message {
  uuid: string;
  timestamp: Date;
  session_key: string;
  message: MessageContent;
  remote_phone_number: string;
  sent_by: string;
}

export interface GetMessagesSuccess {
  success: true;
  messages: Message[];
}

export interface GetMessagesError {
  detail?: string;
  error_message?: string;
}

export type GetMessagesResponse = GetMessagesSuccess | GetMessagesError;

export interface SendMessagePayload {
  to_number: string;
  from_number: string;
  text: string;
  url?: string;
}

export interface SendMessageSuccess {
  success: true;
  batched: boolean;
  message_uuid: string;
}

export interface SendMessageError {
  error_message: string;
}

export type SendMessageResponse = SendMessageSuccess | SendMessageError;

export interface WebhookPayload {
  id: string;
  uuid: string;
  created_at: string;
  session_key: string;
  message: {
    text?: string;
    media?: {
      url: string;
      type: string;
      mime_type: string;
    };
  };
  remote_phone_number: string;
  channel_phone_number?: string;
  sent_by: "user" | "system";
  contact?: {
    first_name: string | null;
    last_name: string | null;
    profile_pic_url: string | null;
    friendly_name?: string;
    device?: string;
  };
}

export interface StandardizedWebhookPayload {
  type: "text" | "image" | "audio" | "video" | "file" | "ptt" | "other";
  messageId: string;
  timestamp: string;
  from: string;
  to: string;
  content: {
    text?: string;
    media?: {
      type: string;
      url: string;
      mimeType: string;
    };
  };
  senderInfo?: {
    name?: string;
    profilePicUrl?: string;
    device?: string;
  };
}
