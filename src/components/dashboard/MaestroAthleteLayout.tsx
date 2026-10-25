'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell, { NavItem } from '@/components/dashboard/DashboardShell';
import { supabase } from '@/lib/supabase/client';
import { getSessionUser } from '@/lib/auth/clientSession';
import { FEEDBACK_READ_EVENT, getFeedbackNonLetti } from '@/lib/feedback/nonLetti';
import { useUnreadChat } from '@/lib/hooks/useUnreadChat';
import { getSecondaryRoles } from '@/lib/roles';
import {
  Calendar,
  Trophy,
  Dumbbell,
  GraduationCap,
  Video,
  Mail,
  LayoutGrid,
  Swords,
  Bell,
  MessageSquarePlus,
} from 'lucide-react';

interface MaestroAthleteLayoutProps {
  children: ReactNode;
}

export default function MaestroAthleteLayout({ children }: MaestroAthleteLayoutProps) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [chatUserId, setChatUserId] = useState<string | null>(null);
  const unreadMessages = useUnreadChat(chatUserId);
  const [unreadFeedback, setUnreadFeedback] = useState(0);

  useEffect(() => {
    // Shell e pagina vengono mostrati subito: profilo, controllo ruolo e messaggi
    // non letti si caricano in parallelo (i dati restano protetti dalla RLS).
    async function loadUser() {
      const {
        data: { user },
      } = await getSessionUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      setUserEmail(user.email || '');
      setChatUserId(user.id);

      const [{ data: profile }] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, role, avatar_url, metadata')
          .eq('id', user.id)
          .single(),
        loadUnreadFeedback(),
      ]);

      const secondaryRoles = getSecondaryRoles(profile?.metadata);
      const canAccessMaestro = profile?.role === 'maestro' || secondaryRoles.includes('maestro');

      if (!profile || !canAccessMaestro) {
        router.replace('/login');
        return;
      }

      setUserName(profile.full_name || 'Maestro');
      setUserAvatar(profile.avatar_url || '');
    }

    async function loadUnreadFeedback() {
      try {
        const nonLetti = await getFeedbackNonLetti();
        let total = 0;
        nonLetti.forEach((n) => (total += n));
        setUnreadFeedback(total);
      } catch {
        // badge non essenziale
      }
    }

    window.addEventListener(FEEDBACK_READ_EVENT, loadUnreadFeedback);

    loadUser();

    return () => {
      window.removeEventListener(FEEDBACK_READ_EVENT, loadUnreadFeedback);
    };
  }, [router]);

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard/maestro',
      icon: <LayoutGrid className="h-5 w-5" />,
    },
    {
      label: 'Maestro',
      href: '/dashboard/maestro/maestro',
      icon: <Dumbbell className="h-5 w-5" />,
    },
    {
      label: 'Prenotazioni',
      href: '/dashboard/maestro/bookings',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      label: 'Competizioni',
      href: '/dashboard/maestro/tornei',
      icon: <Trophy className="h-5 w-5" />,
    },
    {
      label: 'Corsi',
      href: '/dashboard/maestro/corsi',
      icon: <GraduationCap className="h-5 w-5" />,
    },
    {
      label: 'Video Lab',
      href: '/dashboard/maestro/videos',
      icon: <Video className="h-5 w-5" />,
    },
    {
      label: 'Arena GST',
      href: '/dashboard/maestro/arena',
      icon: <Swords className="h-5 w-5" />,
    },
    {
      label: 'Chat',
      href: '/dashboard/maestro/mail',
      icon: <Mail className="h-5 w-5" />,
      dot: unreadMessages > 0,
    },
    {
      label: 'Feedback',
      href: '/dashboard/maestro/feedback',
      icon: <MessageSquarePlus className="h-5 w-5" />,
      dot: unreadFeedback > 0,
    },
    {
      label: 'Centro Notifiche',
      href: '/dashboard/maestro/notifications',
      icon: <Bell className="h-5 w-5" />,
    },
  ];

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
