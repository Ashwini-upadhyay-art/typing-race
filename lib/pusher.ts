"use client";

import Pusher from "pusher-js";

let client: Pusher | null = null;

export function getPusherClient(username: string): Pusher {
  if (client) return client;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) {
    throw new Error(
      "Missing NEXT_PUBLIC_PUSHER_KEY / NEXT_PUBLIC_PUSHER_CLUSTER env vars"
    );
  }
  client = new Pusher(key, {
    cluster,
    authEndpoint: "/api/pusher/auth",
    auth: {
      headers: {
        "x-username": username,
      },
    },
  });
  return client;
}

export function disconnectPusher() {
  if (client) {
    client.disconnect();
    client = null;
  }
}

export function getSocketId(): string | null {
  return client?.connection.socket_id ?? null;
}
