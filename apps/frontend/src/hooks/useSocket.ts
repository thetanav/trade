"use client";

import { useEffect, useMemo, useRef } from "react";
import { getSocket, releaseSocket } from "@/lib/socket";

export function useSocket(symbol?: string) {
  const socket = useMemo(() => getSocket(), []);
  const currentSymbol = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!socket) {
      return;
    }

    if (symbol && symbol !== currentSymbol.current) {
      if (currentSymbol.current) {
        socket.emit("leaveSymbol", currentSymbol.current);
      }
      socket.emit("joinSymbol", symbol);
      currentSymbol.current = symbol;
    }

    return () => {
      if (currentSymbol.current) {
        socket.emit("leaveSymbol", currentSymbol.current);
      }
      releaseSocket();
    };
  }, [socket, symbol]);

  return socket;
}
