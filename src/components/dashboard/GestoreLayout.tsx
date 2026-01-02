"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import DashboardShell, { NavItem } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/lib/supabase/client";
import {
  Home,
  LayoutGrid,
  Calendar,
  Trophy,
  Users,
  MessageSquare,
  Bell,
} from "lucide-react";

interface GestoreLayoutProps {
  children: ReactNode;
}

export default function GestoreLayout({ children }: GestoreLayoutProps) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

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
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (!profile || (profile.role !== "gestore" && profile.role !== "admin")) {
        router.push("/login");
        return;
      }

      setUserName(profile.full_name || "Gestore");
      setLoading(false);
    }

    loadUser();
  }, [router]);

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard/gestore",
      icon: <Home className="h-5 w-5" />,
    },
    {
      label: "Campi",
      href: "/dashboard/gestore/courts",
      icon: <LayoutGrid className="h-5 w-5" />,
    },
    {
      label: "Prenotazioni",
      href: "/dashboard/gestore/bookings",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      label: "Tornei",
      href: "/dashboard/gestore/tornei",
      icon: <Trophy className="h-5 w-5" />,
    },
    {
      label: "Utenti",
      href: "/dashboard/gestore/users",
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: "Bacheca",
      href: "/dashboard/gestore/announcements",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      label: "Notifiche",
      href: "/dashboard/gestore/notifications",
      icon: <Bell className="h-5 w-5" />,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#021627] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-500/20" />
          <p className="text-white/60 font-medium">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      navItems={navItems}
      role="gestore"
      userName={userName}
      userEmail={userEmail}
    >
      {children}
    </DashboardShell>
  );
}
