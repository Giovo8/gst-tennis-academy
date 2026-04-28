"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AdminProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace(`/dashboard/admin/users/${user.id}`);
      } else {
        router.replace("/login");
      }
    });
  }, [router]);

  return null;
}
