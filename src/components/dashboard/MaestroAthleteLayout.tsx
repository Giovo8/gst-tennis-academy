"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import DashboardShell, { NavItem } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Trophy,
  Video,
  Mail,
  User,
  LayoutGrid,
  Swords,
} from "lucide-react";

interface MaestroAthleteLayoutProps {
  children: ReactNode;
}

export default function MaestroAthleteLayout({ children }: MaestroAthleteLayoutProps) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, avatar_url, metadata")
        .eq("id", user.id)
        .single();

      const secondaryRoles = Array.isArray((profile as any)?.metadata?.secondary_roles)
        ? (profile as any).metadata.secondary_roles.map((value: unknown) => String(value).toLowerCase())
        : [];
      const canAccessMaestro = profile?.role === "maestro" || secondaryRoles.includes("maestro");

      if (!profile || !canAccessMaestro) {
        router.push("/login");
        return;
      }

      setUserName(profile.full_name || "Maestro");
      setUserAvatar(profile.avatar_url || "");

      // Count unread messages
      await loadUnreadMessages();

      setLoading(false);
    }

    async function loadUnreadMessages() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { count, error } = await supabase
          .from("internal_messages")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .eq("is_read", false);

        if (!error) {
          setUnreadMessages(count || 0);
        }
      } catch (error) {
        console.error("Errore nel caricamento messaggi non letti:", error);
      }
    }

    // Listen for message read events
    const handleMessageRead = async () => {
      await loadUnreadMessages();
    };

    window.addEventListener('messageRead', handleMessageRead);

    loadUser();

    return () => {
      window.removeEventListener('messageRead', handleMessageRead);
    };
  }, [router]);

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard/maestro",
      icon: <LayoutGrid className="h-5 w-5" />,
    },
    {
      label: "Maestro",
      href: "/dashboard/maestro/maestro",
      icon: <User className="h-5 w-5" />,
    },
    {
      label: "Prenotazioni",
      href: "/dashboard/maestro/bookings",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      label: "Competizioni",
      href: "/dashboard/maestro/tornei",
      icon: <Trophy className="h-5 w-5" />,
    },
    {
      label: "Video Lab",
      href: "/dashboard/maestro/videos",
      icon: <Video className="h-5 w-5" />,
    },
    {
      label: "Arena GST",
      href: "/dashboard/maestro/arena",
      icon: <Swords className="h-5 w-5" />,
    },
    {
      label: "Chat",
      href: "/dashboard/maestro/mail",
      icon: <Mail className="h-5 w-5" />,
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
          <p className="font-medium" style={{ color: 'var(--foreground-muted)' }}>Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      navItems={navItems}
      role="maestro"
      userName={userName}
      userEmail={userEmail}
      userAvatar={userAvatar}
    >
      {children}
    </DashboardShell>
  );
}
