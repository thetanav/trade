"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { User } from "@/types";

type AuthUser = Pick<User, "id" | "name" | "email"> &
  Partial<Pick<User, "stock" | "cash" | "createdAt">>;

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setToken: (token) =>
        set(() => ({
          token,
          isAuthenticated: !!token,
        })),
      setUser: (user) => set(() => ({ user })),
      setAuthenticated: (isAuthenticated) => set(() => ({ isAuthenticated })),
      clearAuth: () =>
        set(() => ({
          token: null,
          user: null,
          isAuthenticated: false,
        })),
    }),
    {
      name: "auth",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
