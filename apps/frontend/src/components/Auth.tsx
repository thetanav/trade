"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth";

export default function Auth() {
  const router = useRouter();
  const { user, isAuthenticated, setUser, setAuthenticated, clearAuth } =
    useAuthStore();
  const { data } = useQuery({
    queryKey: ["user"],
    queryFn: async () =>
      api<{
        user: {
          id: string;
          name: string;
          email: string;
        };
      }>("/user/verify"),
  });
  const { mutate, isPending } = useMutation({
    mutationFn: async () => await api("/auth/logout"),
  });

  const handleSignOut = useCallback(() => {
    localStorage.removeItem("token");
    clearAuth();
    mutate();
    router.push("/");
  }, [clearAuth, mutate, router]);

  useEffect(() => {
    if (!data) return;
    setUser(data.user ?? null);
    setAuthenticated(!!data.user);
  }, [data, setAuthenticated, setUser]);

  if (!data) {
    if (!isAuthenticated) {
      return (
        <Button asChild>
          <Link href="/signup">Create Account</Link>
        </Button>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/trade"
            className="hover:text-foreground transition-colors"
          >
            Trade
          </Link>
          <Link
            href="/order"
            className="hover:text-foreground transition-colors"
          >
            Orders
          </Link>
        </div>
        <Button variant="outline" onClick={handleSignOut} disabled={isPending}>
          {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
          Sign Out
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <Button asChild>
        <Link href="/signup">Create Account</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground px-6">
        <Link
          href="/dashboard"
          className="hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
        <Link href="/trade" className="hover:text-foreground transition-colors">
          Trade
        </Link>
        <Link href="/order" className="hover:text-foreground transition-colors">
          Orders
        </Link>
        <Link
          href="/transactions"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Transactions
        </Link>
      </div>
      <Button variant="outline" onClick={handleSignOut} disabled={isPending}>
        {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
        Sign Out
      </Button>
    </div>
  );
}
