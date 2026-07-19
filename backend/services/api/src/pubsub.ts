import { newRedisConnection } from "./redis.js";

export async function* subscribeChannel(
  channel: string,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const sub = newRedisConnection();
  const queue: string[] = [];
  let wake: (() => void) | undefined;

  const onMessage = (ch: string, message: string) => {
    if (ch !== channel) return;
    queue.push(message);
    wake?.();
  };
  sub.on("message", onMessage);
  await sub.subscribe(channel);

  const onAbort = () => wake?.();
  signal.addEventListener("abort", onAbort, { once: true });

  try {
    while (!signal.aborted) {
      if (queue.length === 0) {
        await new Promise<void>((res) => {
          wake = res;
        });
        wake = undefined;
        continue;
      }
      yield queue.shift() as string;
    }
  } finally {
    signal.removeEventListener("abort", onAbort);
    sub.disconnect();
  }
}
