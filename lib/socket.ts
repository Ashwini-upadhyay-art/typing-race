"use client";

import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/socket/events";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (socket && socket.connected) return socket;
  if (socket) return socket;
  const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
  socket = io(url, {
    autoConnect: true,
    transports: ["websocket"],
    reconnection: true,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
