'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell, { NavItem } from '@/components/dashboard/DashboardShell';
import { supabase } from '@/lib/supabase/client';
import { getSessionUser } from '@/lib/auth/clientSession';
import { getSecondaryRoles } from '@/lib/roles';
import { FEEDBACK_READ_EVENT, getFeedbackNonLetti } from '@/lib/feedback/nonLetti';
import {
  LayoutGrid,
  Calendar,
  Trophy,
  Dumbbell,
  Users,
  Mail,
  Newspaper,
  Video,
  Briefcase,
  Swords,
  FileText,
  Activity,
  GraduationCap,
  Shield,
  Bell,
  MessageSquarePlus,
  Megaphone,
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('');
  // null finché il profilo non è caricato: shell e pagina sono già visibili.
  const [userRole, setUserRole] = useState<'admin' | 'gestore' | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [hasSecondaryMaestroRole, setHasSecondaryMaestroRole] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadFeedback, setUnreadFeedback] = useState(0);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await getSessionUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      setUserEmail(user.email || '');
      setUserId(user.id);

      // Badge non letti in parallelo al profilo (i dati restano protetti dalla RLS)
      const [{ data: profile }] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, role, avatar_url, metadata')
          .eq('id', user.id)
          .single(),
        loadUnreadMessages(user.id),
        loadUnreadFeedback(),
      ]);

      if (!profile || (profile.role !== 'admin' && profile.role !== 'gestore')) {
        router.replace('/login');
        return;
      }

      setUserName(profile.full_name || 'Admin');
      setUserAvatar(profile.avatar_url || '');
      setUserRole(profile.role as 'admin' | 'gestore');

      const secondaryRoles = getSecondaryRoles(profile.metadata);
      setHasSecondaryMaestroRole(secondaryRoles.includes('maestro'));
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

        if (!error) setUnreadMessages(count || 0);
      } catch {
        // badge non essenziale
      }
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

    const handleMessageRead = () => loadUnreadMessages();

    window.addEventListener('messageRead', handleMessageRead);
    window.addEventListener(FEEDBACK_READ_EVENT, loadUnreadFeedback);

    loadUser();

    return () => {
      window.removeEventListener('messageRead', handleMessageRead);
      window.removeEventListener(FEEDBACK_READ_EVENT, loadUnreadFeedback);
    };
  }, [router]);

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard/admin',
      icon: <LayoutGrid className="h-5 w-5" />,
    },
    {
      label: 'Prenotazioni',
      href: '/dashboard/admin/bookings',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      label: 'Competizioni',
      href: '/dashboard/admin/tornei',
      icon: <Trophy className="h-5 w-5" />,
    },
    {
      label: 'Arena GST',
      href: '/dashboard/admin/arena',
      icon: <Swords className="h-5 w-5" />,
    },
    {
      label: 'Corsi',
      href: '/dashboard/admin/corsi',
      icon: <GraduationCap className="h-5 w-5" />,
    },
    {
      label: 'Blocco Campi',
      href: '/dashboard/admin/courts',
      icon: <Shield className="h-5 w-5" />,
    },
    {
      label: 'Video Lab',
      href: '/dashboard/admin/video-lessons',
      icon: <Video className="h-5 w-5" />,
    },
    ...(hasSecondaryMaestroRole
      ? [
          {
            label: 'Maestro',
            href: '/dashboard/admin/maestro',
            icon: <Dumbbell className="h-5 w-5" />,
          } as NavItem,
        ]
      : []),
    {
      label: 'Chat',
      href: '/dashboard/admin/chat',
      icon: <Mail className="h-5 w-5" />,
      dot: unreadMessages > 0,
    },
    {
      label: 'Utenti',
      href: '/dashboard/admin/users',
      icon: <Users className="h-5 w-5" />,
      separatorAfter: true,
    },
    {
      label: 'Staff',
      href: '/dashboard/admin/staff',
      icon: <Briefcase className="h-5 w-5" />,
    },
    {
      label: 'Candidature',
      href: '/dashboard/admin/job-applications',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      label: 'Feedback',
      href: '/dashboard/admin/feedback',
      icon: <MessageSquarePlus className="h-5 w-5" />,
      dot: unreadFeedback > 0,
    },
    {
      label: 'Avvisi',
      href: '/dashboard/admin/avvisi',
      icon: <Megaphone className="h-5 w-5" />,
    },
    {
      label: 'News',
      href: '/dashboard/admin/news',
      icon: <Newspaper className="h-5 w-5" />,
    },
    {
      label: 'Log',
      href: '/dashboard/admin/platform-logs',
      icon: <Activity className="h-5 w-5" />,
    },
    {
      label: 'Centro Notifiche',
      href: '/dashboard/admin/notifications',
      icon: <Bell className="h-5 w-5" />,
    },
  ];

  // I log piattaforma sono solo per admin (nascosti anche finché il ruolo non è noto)
  const filteredNavItems =
    userRole === 'admin'
      ? navItems
      : navItems.filter((item) => item.href !== '/dashboard/admin/platform-logs');

  // Sezione primaria in alto nella sidebar (es. voci principali)
  const primaryNavItems: NavItem[] = filteredNavItems.slice(0, 4);

  return (
    <DashboardShell
      navItems={filteredNavItems}
      primaryNavItems={primaryNavItems}
      role={userRole ?? 'admin'}
      userName={userName}
      userEmail={userEmail}
      userAvatar={userAvatar}
      userId={userId}
    >
      {children}
    </DashboardShell>
  );
}
