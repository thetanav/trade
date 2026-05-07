import { io, Socket } from "socket.io-client";

type SocketState = {
  socket: Socket | null;
  refCount: number;
};

const state: SocketState = {
  socket: null,
  refCount: 0,
};

function resolveSocketUrl() {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (wsUrl && wsUrl.trim().length > 0) {
    return wsUrl;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return undefined;
  }

  try {
    const parsed = new URL(apiUrl);
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

export function getSocket() {
  if (state.socket) {
    state.refCount += 1;
    return state.socket;
  }

  const url = resolveSocketUrl();
  if (!url) {
    return null;
  }

  state.socket = io(url, {
    transports: ["websocket"],
    autoConnect: true,
    withCredentials: true,
  });
  state.refCount = 1;
  return state.socket;
}

export function releaseSocket() {
  if (!state.socket) {
    return;
  }

  state.refCount = Math.max(0, state.refCount - 1);
  if (state.refCount === 0) {
    state.socket.removeAllListeners();
    state.socket.disconnect();
    state.socket = null;
  }
}
