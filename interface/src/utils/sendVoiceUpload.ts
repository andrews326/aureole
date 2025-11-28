// src/utils/sendVoiceMessage.ts

import { mediaService } from "@/services/sessionService";
import type { PersistentChatService } from "@/services/chatService";
import { makeAbsoluteUrl } from "@/utils/url";

export async function sendVoiceMessage(
  partnerId: string,
  blob: Blob,
  chatService: PersistentChatService
) {
  const file = new File([blob], "voice-message.webm", { type: blob.type });

  const uploaded = await mediaService.uploadChatMedia(file);

  // Patch URLs to ABSOLUTE
  uploaded.url = makeAbsoluteUrl(uploaded.url);
  uploaded.thumb = makeAbsoluteUrl(uploaded.thumb);

  chatService.sendMessageMedia({
    receiver_id: partnerId,
    message_type: "audio",
    media_id: uploaded.media_id,
    content: "",
  });

  return uploaded;
}