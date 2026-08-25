"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const configured = isSupabaseConfigured();

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  async function handleLogout() {
    setIsSigningOut(true);
    await supabase?.auth.signOut();
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => null);
    setIsSigningOut(false);
    router.push("/");
  }

  return (
    <Button
      className="tx-rail-button h-9 w-auto shrink-0 gap-2 bg-transparent px-2 text-[var(--tx-shell-text-muted)] shadow-none hover:bg-[var(--tx-shell-hover)] hover:text-[var(--tx-shell-text)] sm:px-3"
      disabled={isSigningOut}
      onClick={handleLogout}
      type="button"
    >
      <LogOut className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">
        {isSigningOut ? "Signing out" : "Log out"}
      </span>
      <span className="sr-only sm:hidden">
        {isSigningOut ? "Signing out" : "Log out"}
      </span>
    </Button>
  );
}
