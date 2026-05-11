"use client";

import { useEffect, useState } from "react";
import { getSocket, type AppSocket } from "@/lib/socket";

export function useSocket(): AppSocket | null {
  const [s, setS] = useState<AppSocket | null>(null);

  useEffect(() => {
    const sock = getSocket();
    setS(sock);
    // We don't disconnect on unmount because the socket is shared across
    // pages (lobby → race → results). The disconnect happens when the user
    // closes the tab.
  }, []);

  return s;
}
