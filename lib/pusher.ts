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

// Subscribe once per channel name and cache the handle. We never auto-
// unsubscribe on hook cleanup: lobby→race navigation tears down the lobby
// hook and mounts the race hook, and if the lobby's cleanup unsubscribes
// the channel, the race page is left with no subscription at all (or
// re-subscribes from scratch with a fresh auth round-trip, losing any
// client-* events sent during that window). Keeping the subscription
// alive for the whole tab session is simpler and avoids all the race
// conditions around mount/unmount ordering.
const subscriptions = new Map<string, Channel>();

export function subscribeRoom(channelName: string, username: string): Channel {
  const cached = subscriptions.get(channelName);
  if (cached) return cached;
  const pusher = getPusherClient(username);
  const channel = pusher.subscribe(channelName);
  subscriptions.set(channelName, channel);
  return channel;
}

// Explicit teardown — called when the user actually leaves the room flow
// (back to landing). Not used in the lobby/race hook cleanups.
export function leaveRoom(channelName: string): void {
  if (!client) return;
  if (!subscriptions.has(channelName)) return;
  subscriptions.delete(channelName);
  client.unsubscribe(channelName);
}

export function disconnectPusher() {
  if (client) {
    client.disconnect();
    client = null;
    subscriptions.clear();
  }
}

export function getSocketId(): string | null {
  return client?.connection.socket_id ?? null;
}
