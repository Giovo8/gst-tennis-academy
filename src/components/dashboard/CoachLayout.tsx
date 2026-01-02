"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import DashboardShell, { NavItem } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/lib/supabase/client";
import {
  Home,
  Calendar,
  Users,
  Video,
  User,
  MessageSquare,
  ClipboardList,
} from "lucide-react";

interface CoachLayoutProps {
  children: ReactNode;
}

export default function CoachLayout({ children }: CoachLayoutProps) {
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

      if (!profile || profile.role !== "maestro") {
        router.push("/login");
        return;
      }

      setUserName(profile.full_name || "Maestro");
      setLoading(false);
    }

    loadUser();
  }, [router]);

  const navItems: NavItem[] = [
    {
      label: "Home",
      href: "/dashboard/maestro",
      icon: <Home className="h-5 w-5" />,
    },
    {
      label: "Agenda",
      href: "/dashboard/maestro/agenda",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      label: "I Miei Allievi",
      href: "/dashboard/maestro/students",
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: "Video Lab",
      href: "/dashboard/maestro/video-lab",
      icon: <Video className="h-5 w-5" />,
    },
    {
      label: "Lezioni",
      href: "/dashboard/maestro/lessons",
      icon: <ClipboardList className="h-5 w-5" />,
    },
    {
      label: "Messaggi",
      href: "/dashboard/maestro/messages",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      label: "Profilo",
      href: "/dashboard/maestro/profile",
      icon: <User className="h-5 w-5" />,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#021627] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-cyan-500/20" />
          <p className="text-white/60 font-medium">Caricamento dashboard...</p>
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
    >
      {children}
    </DashboardShell>
  );
}
