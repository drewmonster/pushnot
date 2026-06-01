import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { env } from "../env.js";

export type PushMessage = {
  sendId: string;
  to: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  deepLink?: string | null;
  tenantId: string;
  campaignId: string;
  androidChannelId?: string | null;
};

export type PushSendResult = {
  sendId: string;
  ok: boolean;
  providerTicketId?: string;
  errorMessage?: string;
};

export type PushReceiptResult = {
  ticketId: string;
  ok: boolean;
  invalidToken: boolean;
  errorMessage?: string;
};

export interface PushProvider {
  send(messages: PushMessage[]): Promise<PushSendResult[]>;
  getReceipts(ticketIds: string[]): Promise<PushReceiptResult[]>;
}

export class ExpoPushProvider implements PushProvider {
  private readonly expo = new Expo(
    env.EXPO_ACCESS_TOKEN ? { accessToken: env.EXPO_ACCESS_TOKEN } : undefined
  );

  async send(messages: PushMessage[]): Promise<PushSendResult[]> {
    const validMessages = messages.filter((message) => Expo.isExpoPushToken(message.to));
    const invalidMessages = messages.filter((message) => !Expo.isExpoPushToken(message.to));

    const results: PushSendResult[] = invalidMessages.map((message) => ({
      sendId: message.sendId,
      ok: false,
      errorMessage: "Invalid Expo push token"
    }));

    const expoMessages: ExpoPushMessage[] = validMessages.map(toExpoPushMessage);

    const chunks = this.expo.chunkPushNotifications(expoMessages);
    let cursor = 0;

    for (const chunk of chunks) {
      const tickets = await this.expo.sendPushNotificationsAsync(chunk);

      tickets.forEach((ticket) => {
        const source = validMessages[cursor];
        cursor += 1;

        if (ticket.status === "ok") {
          results.push({
            sendId: source.sendId,
            ok: true,
            providerTicketId: ticket.id
          });
          return;
        }

        results.push({
          sendId: source.sendId,
          ok: false,
          errorMessage: ticket.message
        });
      });
    }

    return results;
  }

  async getReceipts(ticketIds: string[]): Promise<PushReceiptResult[]> {
    const receipts = await this.expo.getPushNotificationReceiptsAsync(ticketIds);

    return ticketIds.map((ticketId) => {
      const receipt = receipts[ticketId];

      if (!receipt) {
        return {
          ticketId,
          ok: false,
          invalidToken: false,
          errorMessage: "Receipt not found"
        };
      }

      if (receipt.status === "ok") {
        return {
          ticketId,
          ok: true,
          invalidToken: false
        };
      }

      return {
        ticketId,
        ok: false,
        invalidToken: receipt.details?.error === "DeviceNotRegistered",
        errorMessage: receipt.message
      };
    });
  }
}

export function toExpoPushMessage(message: PushMessage): ExpoPushMessage {
  return {
    to: message.to,
    title: message.title,
    body: message.body,
    sound: "default",
    channelId: message.androidChannelId ?? undefined,
    richContent: message.imageUrl ? { image: message.imageUrl } : undefined,
    data: {
      tenantId: message.tenantId,
      campaignId: message.campaignId,
      sendId: message.sendId,
      imageUrl: message.imageUrl ?? undefined,
      deepLink: message.deepLink ?? undefined
    }
  };
}

export class MockPushProvider implements PushProvider {
  async send(messages: PushMessage[]): Promise<PushSendResult[]> {
    return messages.map((message) => {
      const shouldFail =
        message.to.toLowerCase().includes("mock-fail") ||
        (env.PUSH_MOCK_FAILURE_RATE > 0 && Math.random() < env.PUSH_MOCK_FAILURE_RATE);

      if (shouldFail) {
        return {
          sendId: message.sendId,
          ok: false,
          errorMessage: "Mock provider simulated failure"
        };
      }

      return {
        sendId: message.sendId,
        ok: true,
        providerTicketId: `mock-ticket-${message.sendId}`
      };
    });
  }

  async getReceipts(ticketIds: string[]): Promise<PushReceiptResult[]> {
    return ticketIds.map((ticketId) => ({
      ticketId,
      ok: !ticketId.includes("mock-receipt-fail"),
      invalidToken: ticketId.includes("mock-invalid-token"),
      errorMessage: ticketId.includes("mock-receipt-fail") ? "Mock receipt simulated failure" : undefined
    }));
  }
}

export function createPushProvider(): PushProvider {
  if (env.PUSH_PROVIDER === "mock") {
    return new MockPushProvider();
  }

  return new ExpoPushProvider();
}

export const pushProvider = createPushProvider();
