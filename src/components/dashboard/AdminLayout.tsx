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
  Settings,
  Key,
  Newspaper,
  Image,
  Layers,
  Bell,
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
      label: "Control Room",
      href: "/dashboard/admin",
      icon: <Home className="h-5 w-5" />,
    },
    {
      label: "Campi Real-Time",
      href: "/dashboard/admin/courts",
      icon: <LayoutGrid className="h-5 w-5" />,
    },
    {
      label: "Prenotazioni",
      href: "/dashboard/admin/bookings",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      label: "Tornei",
      href: "/dashboard/admin/tornei",
      icon: <Trophy className="h-5 w-5" />,
    },
    {
      label: "Anagrafica",
      href: "/dashboard/admin/users",
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: "Comunicazioni",
      href: "/dashboard/admin/communications",
      icon: <MessageSquare className="h-5 w-5" />,
      children: [
        {
          label: "Chat",
          href: "/dashboard/admin/chat",
          icon: <MessageSquare className="h-4 w-4" />,
        },
        {
          label: "Email",
          href: "/dashboard/admin/email",
          icon: <Mail className="h-4 w-4" />,
        },
        {
          label: "Notifiche",
          href: "/dashboard/admin/notifications",
          icon: <Bell className="h-4 w-4" />,
        },
      ],
    },
    {
      label: "Contenuti",
      href: "/dashboard/admin/content",
      icon: <Layers className="h-5 w-5" />,
      children: [
        {
          label: "News",
          href: "/dashboard/admin/news",
          icon: <Newspaper className="h-4 w-4" />,
        },
        {
          label: "Annunci",
          href: "/dashboard/admin/announcements",
          icon: <Bell className="h-4 w-4" />,
        },
        {
          label: "Galleria",
          href: "/dashboard/admin/gallery",
          icon: <Image className="h-4 w-4" />,
        },
      ],
    },
    {
      label: "Codici Invito",
      href: "/dashboard/admin/invite-codes",
      icon: <Key className="h-5 w-5" />,
    },
    {
      label: "Impostazioni",
      href: "/dashboard/admin/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background-subtle)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--foreground-muted)]">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      navItems={navItems}
      role={userRole}
      userName={userName}
      userEmail={userEmail}
    >
      {children}
    </DashboardShell>
  );
}
