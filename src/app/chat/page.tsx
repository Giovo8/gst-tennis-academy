"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import ChatPanel from "@/components/chat/ChatPanel";

export default function ChatPage() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-6 py-16">
      <div className="max-w-7xl mx-auto">
        <ChatPanel />
      </div>
    </div>
  );
}
