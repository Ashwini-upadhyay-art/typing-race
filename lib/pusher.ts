"use client";

import Pusher from "pusher-js";
import type { Channel } from "pusher-js";

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

// Refcount channel subscriptions so multiple hooks (lobby + race) can
// share the same presence membership. Without this, when Next.js mounts
// the race page before unmounting the lobby, the lobby's cleanup would
// unsubscribe the channel out from under the race page — leaving it with
// an orphan ref that never receives client events.
const refCounts = new Map<string, number>();

export function acquireChannel(channelName: string, username: string): Channel {
  const pusher = getPusherClient(username);
  refCounts.set(channelName, (refCounts.get(channelName) ?? 0) + 1);
  return pusher.subscribe(channelName);
}

export function releaseChannel(channelName: string): void {
  if (!client) return;
  const count = refCounts.get(channelName) ?? 0;
  if (count <= 1) {
    refCounts.delete(channelName);
    client.unsubscribe(channelName);
  } else {
    refCounts.set(channelName, count - 1);
  }
}

export function disconnectPusher() {
  if (client) {
    client.disconnect();
    client = null;
    refCounts.clear();
  }
}

export function getSocketId(): string | null {
  return client?.connection.socket_id ?? null;
}
