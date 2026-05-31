import { prisma } from "../prisma.js";
import { sanitizeError } from "./errors.js";
import { pushProvider } from "./pushProvider.js";

type ReceiptCheckJob = {
  sendIds: string[];
};

const INVALID_TOKEN_ERRORS = new Set(["DeviceNotRegistered"]);

export async function processExpoReceipts(job: ReceiptCheckJob) {
  const sends = await prisma.notificationSend.findMany({
    where: {
      id: { in: job.sendIds },
      providerTicketId: { not: null },
      status: "sent_to_provider"
    },
    select: {
      id: true,
      deviceId: true,
      providerTicketId: true
    }
  });

  const ticketIds = sends
    .map((send) => send.providerTicketId)
    .filter((ticketId): ticketId is string => Boolean(ticketId));

  if (ticketIds.length === 0) {
    return { checked: 0, receiptOk: 0, receiptError: 0, invalidatedDevices: 0 };
  }

  const receipts = await pushProvider.getReceipts(ticketIds);
  const sendByTicketId = new Map(sends.map((send) => [send.providerTicketId, send]));
  let receiptOk = 0;
  let receiptError = 0;
  let invalidatedDevices = 0;

  for (const receipt of receipts) {
    const send = sendByTicketId.get(receipt.ticketId);
    if (!send) {
      continue;
    }

    if (receipt.ok) {
      receiptOk += 1;
      await prisma.notificationSend.update({
        where: { id: send.id },
        data: {
          status: "receipt_ok",
          receiptCheckedAt: new Date(),
          errorMessage: null
        }
      });
      continue;
    }

    receiptError += 1;
    await prisma.notificationSend.update({
      where: { id: send.id },
      data: {
        status: "receipt_error",
        receiptCheckedAt: new Date(),
        errorMessage: sanitizeError(receipt.errorMessage ?? "Receipt error")
      }
    });

    if (send.deviceId && isInvalidTokenReceipt(receipt)) {
      const device = await prisma.device.update({
        where: { id: send.deviceId },
        data: {
          pushStatus: "invalid",
          invalidatedAt: new Date()
        }
      });

      if (device) {
        invalidatedDevices += 1;
      }
    }
  }

  return {
    checked: receipts.length,
    receiptOk,
    receiptError,
    invalidatedDevices
  };
}

function isInvalidTokenReceipt(receipt: { invalidToken: boolean; errorMessage?: string }) {
  return (
    receipt.invalidToken ||
    (receipt.errorMessage ? INVALID_TOKEN_ERRORS.has(receipt.errorMessage) : false)
  );
}
