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
      className="bg-[#062050] px-4 text-white shadow-[0_10px_22px_rgba(7,36,91,0.16)] hover:bg-[#093a83]"
      disabled={isSigningOut}
      onClick={handleLogout}
      type="button"
    >
      <LogOut className="size-4" aria-hidden="true" />
      {isSigningOut ? "Signing out" : "Log out"}
    </Button>
  );
}
