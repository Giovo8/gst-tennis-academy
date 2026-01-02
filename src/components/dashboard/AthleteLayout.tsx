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
  Megaphone,
} from "lucide-react";

interface AthleteLayoutProps {
  children: ReactNode;
}

export default function AthleteLayout({ children }: AthleteLayoutProps) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [pendingBookings, setPendingBookings] = useState(0);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);

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
        .select("full_name, role, avatar_url")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "atleta") {
        router.push("/login");
        return;
      }

      setUserName(profile.full_name || "Atleta");
      setUserAvatar(profile.avatar_url || "");

      // Count pending bookings
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending");
      
      setPendingBookings(count || 0);

      // Count unread announcements
      await loadUnreadCount(user.id);

      setLoading(false);
    }

    async function loadUnreadCount(userId: string) {
      const { data: announcements } = await supabase
        .from("announcements")
        .select("id")
        .eq("is_published", true)
        .or("expiry_date.is.null,expiry_date.gt." + new Date().toISOString());

      if (announcements && announcements.length > 0) {
        const announcementIds = announcements.map((a) => a.id);
        
        const { data: viewedAnnouncements } = await supabase
          .from("announcement_views")
          .select("announcement_id")
          .eq("user_id", userId)
          .in("announcement_id", announcementIds);

        const viewedIds = new Set(viewedAnnouncements?.map((v) => v.announcement_id) || []);
        const unreadCount = announcements.filter((a) => !viewedIds.has(a.id)).length;
        setUnreadAnnouncements(unreadCount);
      } else {
        setUnreadAnnouncements(0);
      }
    }

    // Listen for announcement read events
    const handleAnnouncementRead = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await loadUnreadCount(user.id);
      }
    };

    window.addEventListener('announcementRead', handleAnnouncementRead);

    loadUser();

    return () => {
      window.removeEventListener('announcementRead', handleAnnouncementRead);
    };
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
      badge: pendingBookings > 0 ? pendingBookings : undefined,
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
      label: "Annunci",
      href: "/dashboard/atleta/annunci",
      icon: <Megaphone className="h-5 w-5" />,
      badge: unreadAnnouncements > 0 ? unreadAnnouncements : undefined,
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
      role="atleta"
      userName={userName}
      userEmail={userEmail}
      userAvatar={userAvatar}
    >
      {children}
    </DashboardShell>
  );
}
