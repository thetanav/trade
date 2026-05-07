"use client";

import { useEffect, useMemo } from "react";
import { getSocket, releaseSocket } from "@/lib/socket";

export function useSocket() {
  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    if (!socket) {
      return;
    }

    return () => {
      releaseSocket();
    };
  }, [socket]);

  return socket;
}
