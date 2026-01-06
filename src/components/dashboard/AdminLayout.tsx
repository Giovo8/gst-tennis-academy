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
  Mail,
  Send,
  Key,
  Newspaper,
  Image,
  Bell,
  Video,
  Briefcase,
  UsersIcon,
  Swords,
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<"admin" | "gestore">("admin");
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

      if (!profile || (profile.role !== "admin" && profile.role !== "gestore")) {
        router.push("/login");
        return;
      }

      setUserName(profile.full_name || "Admin");
      setUserRole(profile.role as "admin" | "gestore");
      setLoading(false);
    }

    loadUser();
  }, [router]);

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard/admin",
      icon: <LayoutGrid className="h-5 w-5" />,
    },
    {
      label: "Prenotazioni",
      href: "/dashboard/admin/bookings",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      label: "Competizioni",
      href: "/dashboard/admin/tornei",
      icon: <Trophy className="h-5 w-5" />,
    },
    {
      label: "Arena",
      href: "/dashboard/admin/arena",
      icon: <Swords className="h-5 w-5" />,
    },
    {
      label: "Utenti",
      href: "/dashboard/admin/users",
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: "Video Lezioni",
      href: "/dashboard/admin/video-lessons",
      icon: <Video className="h-5 w-5" />,
    },
    {
      label: "Chat",
      href: "/dashboard/admin/chat",
      icon: <Mail className="h-5 w-5" />,
    },
    {
      label: "Mail Marketing",
      href: "/dashboard/admin/mail-marketing",
      icon: <Send className="h-5 w-5" />,
    },
    {
      label: "News",
      href: "/dashboard/admin/news",
      icon: <Newspaper className="h-5 w-5" />,
    },
    {
      label: "Annunci",
      href: "/dashboard/admin/announcements",
      icon: <Bell className="h-5 w-5" />,
    },
    {
      label: "Staff",
      href: "/dashboard/admin/staff",
      icon: <UsersIcon className="h-5 w-5" />,
    },
  ];

  // Sezione primaria in alto nella sidebar (es. voci principali)
  const primaryNavItems: NavItem[] = navItems.slice(0, 4);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      navItems={navItems}
      primaryNavItems={primaryNavItems}
      role={userRole}
      userName={userName}
      userEmail={userEmail}
    >
      {children}
    </DashboardShell>
  );
}
