export type ReadReceiptState = "sent" | "delivered" | "seen";

export type ReadReceiptMessage = {
  id: string;
  createdAt: string;
  deliveredAt?: string | null;
  senderId: string;
};

export function resolveReadReceiptState(
  message: Pick<ReadReceiptMessage, "createdAt" | "deliveredAt">,
  peerLastReadAt: string | null | undefined,
): ReadReceiptState {
  if (peerLastReadAt) {
    const readMs = new Date(peerLastReadAt).getTime();
    const createdMs = new Date(message.createdAt).getTime();

    if (!Number.isNaN(readMs) && !Number.isNaN(createdMs) && readMs >= createdMs) {
      return "seen";
    }
  }

  if (message.deliveredAt) {
    return "delivered";
  }

  return "sent";
}

export function latestOutgoingMessageId(
  messages: ReadReceiptMessage[],
  currentUserId: string,
): string | null {
  let latest: ReadReceiptMessage | null = null;

  for (const message of messages) {
    if (message.senderId !== currentUserId) {
      continue;
    }

    if (!latest || new Date(message.createdAt).getTime() > new Date(latest.createdAt).getTime()) {
      latest = message;
    }
  }

  return latest?.id ?? null;
}

export function shouldShowReadReceipt(input: {
  messageId: string;
  latestOutgoingMessageId: string | null;
  isFromCurrentUser: boolean;
  peerIsBlocked: boolean;
}): boolean {
  if (!input.isFromCurrentUser || input.peerIsBlocked) {
    return false;
  }

  return input.messageId === input.latestOutgoingMessageId;
}

export function incomingUndeliveredMessageIds(
  messages: Array<{ id: string; sender_id: string; delivered_at?: string | null }>,
  currentUserId: string,
): string[] {
  return messages
    .filter(
      (message) =>
        message.sender_id !== currentUserId && !message.delivered_at?.trim(),
    )
    .map((message) => message.id);
}
