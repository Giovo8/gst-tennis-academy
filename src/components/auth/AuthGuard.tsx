'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getDestinationForRole, type UserRole } from '@/lib/roles';

type Props = {
  children: ReactNode;
  allowedRoles?: string[];
};

// Ruolo dell'utente corrente, condiviso tra tutte le istanze: dopo il primo
// controllo le navigazioni successive non rileggono il profilo e la pagina
// compare subito, senza schermata "Caricamento...".
let cachedRole: { userId: string; role: string } | null = null;

function isAllowed(role: string, allowedRoles?: string[]) {
  return !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(role);
}

export default function AuthGuard({ children, allowedRoles }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(
    () => cachedRole !== null && isAllowed(cachedRole.role, allowedRoles),
  );
  // Gli array passati inline cambiano identità a ogni render: la chiave stringa
  // evita di rieseguire il controllo (e risottoscrivere il listener) ogni volta.
  const rolesKey = allowedRoles?.join(',') ?? '';

  useEffect(() => {
    let mounted = true;
    const allowedRoles = rolesKey ? rolesKey.split(',') : undefined;

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      if (!session) {
        cachedRole = null;
        router.replace('/login');
        return;
      }

      if (!allowedRoles || allowedRoles.length === 0) {
        setReady(true);
        return;
      }

      let role = cachedRole?.userId === session.user.id ? cachedRole.role : null;
      if (!role) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (!mounted) return;
        if (error || !data) {
          router.replace('/login');
          return;
        }
        role = data.role as string;
        cachedRole = { userId: session.user.id, role };
      }

      if (!allowedRoles.includes(role)) {
        router.replace(getDestinationForRole(role as UserRole));
        return;
      }

      setReady(true);
    }

    check();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        cachedRole = null;
        router.replace('/login');
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [router, rolesKey]);

  if (!ready) {
    return (
      <div className="space-y-6 animate-pulse pt-3" aria-busy="true" aria-label="Caricamento">
        <div className="h-10 w-1/3 bg-gray-200 rounded-lg" />
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-72 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return <>{children}</>;
}
