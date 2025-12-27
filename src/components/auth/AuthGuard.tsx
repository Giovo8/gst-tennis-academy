"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getDestinationForRole, type UserRole } from "@/lib/roles";

type Props = {
  children: ReactNode;
  allowedRoles?: string[];
};

export default function AuthGuard({ children, allowedRoles }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      if (!session) {
        router.replace("/login");
        return;
      }

      // If role required, fetch profile
      if (allowedRoles && allowedRoles.length > 0) {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (error || !data) {
          router.replace("/login");
          return;
        }
        setRole(data.role);
        if (!allowedRoles.includes(data.role)) {
          // Redirect to correct dashboard based on user's role
          const destination = getDestinationForRole(data.role as UserRole);
          router.replace(destination);
          return;
        }
      }

      setLoading(false);
      supabase.auth.onAuthStateChange((event, session) => {
        if (!session) router.replace("/login");
      });
    }

    check();
    return () => {
      mounted = false;
    };
  }, [router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span>Caricamento...</span>
      </div>
    );
  }

  return <>{children}</>;
}
