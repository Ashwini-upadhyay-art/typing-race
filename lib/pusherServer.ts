import Pusher from "pusher";

let server: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (server) return server;
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;
  if (!appId || !key || !secret || !cluster) {
    throw new Error(
      "Missing one of PUSHER_APP_ID / PUSHER_KEY / PUSHER_SECRET / PUSHER_CLUSTER env vars"
    );
  }
  server = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
  return server;
}
