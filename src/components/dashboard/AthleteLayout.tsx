"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import DashboardShell, { NavItem } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/lib/supabase/client";
import {
  Home,
  Calendar,
  Trophy,
  Video,
  User,
  Clock,
  CreditCard,
} from "lucide-react";

interface AthleteLayoutProps {
  children: ReactNode;
}

export default function AthleteLayout({ children }: AthleteLayoutProps) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [pendingBookings, setPendingBookings] = useState(0);

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

      if (!profile || profile.role !== "atleta") {
        router.push("/login");
        return;
      }

      setUserName(profile.full_name || "Atleta");

      // Count pending bookings
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending");
      
      setPendingBookings(count || 0);
      setLoading(false);
    }

    loadUser();
  }, [router]);

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard/atleta",
      icon: <Home className="h-5 w-5" />,
    },
    {
      label: "Prenotazioni",
      href: "/dashboard/atleta/bookings",
      icon: <Calendar className="h-5 w-5" />,
      badge: pendingBookings,
    },
    {
      label: "Tornei",
      href: "/dashboard/atleta/tornei",
      icon: <Trophy className="h-5 w-5" />,
    },
    {
      label: "I Miei Video",
      href: "/dashboard/atleta/videos",
      icon: <Video className="h-5 w-5" />,
    },
    {
      label: "Abbonamento",
      href: "/dashboard/atleta/subscription",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      label: "Profilo",
      href: "/dashboard/atleta/profile",
      icon: <User className="h-5 w-5" />,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#021627] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-sky-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-sky-500/20" />
          <p className="text-white/60 font-medium">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      navItems={navItems}
      role="atleta"
      userName={userName}
      userEmail={userEmail}
    >
      {children}
    </DashboardShell>
  );
}
