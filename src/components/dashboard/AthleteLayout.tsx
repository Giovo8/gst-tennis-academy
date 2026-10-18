'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell, { NavItem } from '@/components/dashboard/DashboardShell';
import { supabase } from '@/lib/supabase/client';
import { getSessionUser } from '@/lib/auth/clientSession';
import {
  Calendar,
  Trophy,
  Video,
  MessageSquare,
  LayoutGrid,
  Swords,
  GraduationCap,
  User,
  Bell,
} from 'lucide-react';

interface AthleteLayoutProps {
  children: ReactNode;
}

export default function AthleteLayout({ children }: AthleteLayoutProps) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [unreadMessages, setUnreadMessages] = useState(0);

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
      const isViewAsRequest = !!new URLSearchParams(window.location.search).get('viewAs');

      const [{ data: profile }] = await Promise.all([
        supabase.from('profiles').select('full_name, role, avatar_url').eq('id', user.id).single(),
        isViewAsRequest ? Promise.resolve() : loadUnreadMessages(user.id),
      ]);

      // Gli admin possono aprire le pagine atleta solo in modalità "vedi come" (?viewAs=<id>)
      const isViewAs = ['admin', 'gestore'].includes(profile?.role ?? '') && isViewAsRequest;

      if (!profile || (profile.role !== 'atleta' && !isViewAs)) {
        router.replace('/login');
        return;
      }

      setUserName(profile.full_name || 'Atleta');
      setUserAvatar(profile.avatar_url || '');
    }

    async function loadUnreadMessages(knownUserId?: string) {
      try {
        const userId = knownUserId ?? (await getSessionUser()).data.user?.id;
        if (!userId) return;

        const { count, error } = await supabase
          .from('internal_messages')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', userId)
          .eq('is_read', false);

        if (!error) {
          setUnreadMessages(count || 0);
        }
      } catch (error) {
        console.error('Errore nel caricamento messaggi non letti:', error);
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
      label: 'Dashboard',
      href: '/dashboard/atleta',
      icon: <LayoutGrid className="h-5 w-5" />,
    },
    {
      label: 'Prenotazioni',
      href: '/dashboard/atleta/bookings',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      label: 'Competizioni',
      href: '/dashboard/atleta/tornei',
      icon: <Trophy className="h-5 w-5" />,
    },
    {
      label: 'Corsi',
      href: '/dashboard/atleta/corsi',
      icon: <GraduationCap className="h-5 w-5" />,
    },
    {
      label: 'Video Lab',
      href: '/dashboard/atleta/videos',
      icon: <Video className="h-5 w-5" />,
    },
    {
      label: 'Arena GST',
      href: '/dashboard/atleta/arena',
      icon: <Swords className="h-5 w-5" />,
    },
    {
      label: 'Chat',
      href: '/dashboard/atleta/mail',
      icon: <MessageSquare className="h-5 w-5" />,
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    },
    {
      label: 'Profilo',
      href: '/dashboard/atleta/profile',
      icon: <User className="h-5 w-5" />,
    },
    {
      label: 'Centro Notifiche',
      href: '/dashboard/atleta/notifications',
      icon: <Bell className="h-5 w-5" />,
    },
  ];

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
