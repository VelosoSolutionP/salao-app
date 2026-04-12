import { redis, CK } from "@/lib/redis";

export type SSEEvent = {
  type:
    | "appointment.created"
    | "appointment.updated"
    | "appointment.cancelled"
    | "ping";
  data?: Record<string, unknown>;
  timestamp: string;
};

export async function publishSSE(
  salonId: string,
  event: Omit<SSEEvent, "timestamp">
) {
  const payload: SSEEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  try {
    await redis.publish(CK.SSE_CHANNEL(salonId), JSON.stringify(payload));
  } catch {
    // SSE publish failure should never break the main flow
  }
}

export function createSSEStream(salonId: string): ReadableStream {
  let interval: ReturnType<typeof setInterval>;

  return new ReadableStream({
    start(controller) {
      const send = (event: SSEEvent) => {
        try {
          controller.enqueue(
            `data: ${JSON.stringify(event)}\n\n`
          );
        } catch {
          cleanup();
        }
      };

      // Ping every 25s to keep connection alive
      interval = setInterval(() => {
        send({ type: "ping", timestamp: new Date().toISOString() });
      }, 25000);

      // Subscribe via Upstash Redis pub/sub (polling approach for serverless)
      const pollInterval = setInterval(async () => {
        // In production, use Upstash pub/sub or webhook approach
        // For now using polling with a channel key
        const messages = await redis.lrange(
          `sse:queue:${salonId}`,
          0,
          -1
        );
        if (messages.length > 0) {
          await redis.del(`sse:queue:${salonId}`);
          for (const msg of messages) {
            try {
              send(JSON.parse(msg as string));
            } catch {}
          }
        }
      }, 2000);

      const cleanup = () => {
        clearInterval(interval);
        clearInterval(pollInterval);
        try {
          controller.close();
        } catch {}
      };

      (controller as any)._cleanup = cleanup;
    },
    cancel() {
      if (interval) clearInterval(interval);
    },
  });
}

export async function queueSSEEvent(
  salonId: string,
  event: Omit<SSEEvent, "timestamp">
) {
  const payload: SSEEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  await redis.lpush(`sse:queue:${salonId}`, JSON.stringify(payload));
  await redis.expire(`sse:queue:${salonId}`, 30);
}
