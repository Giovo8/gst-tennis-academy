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
  Dumbbell,
  Users,
  MessageSquare,
  Mail,
  Key,
  Newspaper,
  Image,
  Video,
  Briefcase,
  Swords,
  FileText,
  Activity,
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [userRole, setUserRole] = useState<"admin" | "gestore">("admin");
  const [userId, setUserId] = useState<string>("");
  const [hasSecondaryMaestroRole, setHasSecondaryMaestroRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email || "");
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, avatar_url, metadata")
        .eq("id", user.id)
        .single();

      if (!profile || (profile.role !== "admin" && profile.role !== "gestore")) {
        router.push("/login");
        return;
      }

      setUserName(profile.full_name || "Admin");
      setUserAvatar(profile.avatar_url || "");
      setUserRole(profile.role as "admin" | "gestore");

      const secondaryRoles = Array.isArray((profile as any).metadata?.secondary_roles)
        ? (profile as any).metadata.secondary_roles.map((value: unknown) => String(value).toLowerCase())
        : [];
      setHasSecondaryMaestroRole(secondaryRoles.includes("maestro"));

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
      label: "Arena GST",
      href: "/dashboard/admin/arena",
      icon: <Swords className="h-5 w-5" />,
    },
    {
      label: "Video Lab",
      href: "/dashboard/admin/video-lessons",
      icon: <Video className="h-5 w-5" />,
    },
    ...(hasSecondaryMaestroRole
      ? [
          {
            label: "Maestro",
            href: "/dashboard/admin/maestro",
            icon: <Dumbbell className="h-5 w-5" />,
          } as NavItem,
        ]
      : []),
    {
      label: "Chat",
      href: "/dashboard/admin/chat",
      icon: <Mail className="h-5 w-5" />,
    },
    {
      label: "Utenti",
      href: "/dashboard/admin/users",
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: "Staff",
      href: "/dashboard/admin/staff",
      icon: <Briefcase className="h-5 w-5" />,
    },
    {
      label: "Candidature",
      href: "/dashboard/admin/job-applications",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      label: "News",
      href: "/dashboard/admin/news",
      icon: <Newspaper className="h-5 w-5" />,
    },
    {
      label: "Log",
      href: "/dashboard/admin/platform-logs",
      icon: <Activity className="h-5 w-5" />,
    },
  ];

  // Filtra i log piattaforma per il ruolo gestore
  const filteredNavItems = userRole === "gestore"
    ? navItems.filter(item => item.href !== "/dashboard/admin/platform-logs")
    : navItems;

  // Sezione primaria in alto nella sidebar (es. voci principali)
  const primaryNavItems: NavItem[] = filteredNavItems.slice(0, 4);

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
      navItems={filteredNavItems}
      primaryNavItems={primaryNavItems}
      role={userRole}
      userName={userName}
      userEmail={userEmail}
      userAvatar={userAvatar}
      userId={userId}
    >
      {children}
    </DashboardShell>
  );
}
