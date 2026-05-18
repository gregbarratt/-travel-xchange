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
    setIsSigningOut(false);
    router.push("/");
  }

  return (
    <Button
      className="bg-[#082f49] hover:bg-[#0c4a6e]"
      disabled={isSigningOut}
      onClick={handleLogout}
      type="button"
    >
      <LogOut className="size-4" aria-hidden="true" />
      {isSigningOut ? "Signing out" : "Log out"}
    </Button>
  );
}
