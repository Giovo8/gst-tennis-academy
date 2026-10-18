'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { getSessionUser } from '@/lib/auth/clientSession';
import type { User } from '@supabase/supabase-js';

type PublicNavbarProps = {
  home?: boolean;
  /** Barra a filo: senza bordi, angoli arrotondati e distanza dai margini */
  flush?: boolean;
};

export default function PublicNavbar({ home = false, flush = false }: PublicNavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Check current user
    getSessionUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        // Get user role and full name
        supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUserRole(data.role);
            }
          });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUserRole(data.role);
            }
          });
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getDashboardLink = () => {
    if (!userRole) return '/login';
    if (userRole === 'admin' || userRole === 'gestore') return '/dashboard/admin';
    if (userRole === 'maestro') return '/dashboard/maestro';
    if (userRole === 'atleta') return '/dashboard/atleta';
    return '/dashboard';
  };

  return (
    <>
      {home && !flush && (
        <div
          className="hidden lg:block fixed inset-x-0 top-0 h-8 bg-white z-40 pointer-events-none"
          aria-hidden="true"
        />
      )}
      <nav
        className={
          flush
            ? 'bg-secondary fixed top-0 left-0 right-0 z-50 [transform:translateZ(0)] lg:sticky'
            : home
            ? 'bg-secondary fixed top-4 left-6 right-6 z-50 border border-black/10 rounded-lg shadow-none [transform:translateZ(0)] lg:sticky lg:top-1 lg:mx-0 lg:mt-1 lg:rounded-none lg:rounded-t-xl'
            : 'bg-white fixed top-4 left-6 right-6 lg:sticky lg:top-4 lg:left-auto lg:right-auto lg:mx-6 lg:mt-4 z-50 shadow-sm rounded-xl border border-black/10 [transform:translateZ(0)]'
        }
      >
        <div
          className={
            home
              ? 'relative max-w-7xl mx-auto px-6 lg:px-8'
              : 'relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8'
          }
        >
          <div
            className={
              home
                ? 'relative flex items-center h-20'
                : 'relative flex items-center h-[4.5rem] lg:h-[5rem]'
            }
          >
            {/* Logo + title, left aligned on all breakpoints */}
            <Link
              href="/"
              aria-label="Home - GST Tennis Academy"
              className="flex items-center gap-1.5 lg:gap-2 min-w-0"
            >
              <Image
                src="/images/logo-tennis-96.png"
                alt="GST Tennis Academy"
                width={48}
                height={48}
                priority
                unoptimized
                className={home ? 'h-7 w-7 lg:h-8 lg:w-8' : 'h-8 w-8'}
              />
              <span
                className={
                  home
                    ? 'text-xl lg:text-2xl font-bold leading-none text-white whitespace-nowrap'
                    : 'text-lg font-bold leading-none text-secondary'
                }
              >
                GST Academy
              </span>
            </Link>

            <Link
              href={getDashboardLink()}
              className={`group relative overflow-hidden ml-auto inline-flex items-center justify-center rounded-lg text-[15px] font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 ${
                home
                  ? '!h-9 !min-h-0 px-4 !py-0 text-secondary bg-white shadow-md shadow-black/30 ring-1 ring-white/60 hover:bg-sky-50 hover:shadow-lg hover:shadow-black/40 hover:ring-4 hover:ring-white/35 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-secondary'
                  : 'px-4 py-2 text-white bg-secondary shadow-md shadow-secondary/30 hover:bg-secondary/85 hover:shadow-lg hover:shadow-secondary/40 hover:ring-4 hover:ring-secondary/25 focus-visible:ring-secondary focus-visible:ring-offset-2'
              }`}
            >
              {/* Riflesso lucido che attraversa il pulsante all'hover */}
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-y-0 -left-full w-3/4 -skew-x-12 bg-gradient-to-r from-transparent to-transparent transition-[left] duration-500 ease-out group-hover:left-[130%] motion-reduce:hidden ${
                  home ? 'via-secondary/30' : 'via-white/45'
                }`}
              />
              <span className="relative">{user ? 'Area GST' : 'Accedi'}</span>
            </Link>
          </div>
        </div>
      </nav>
      <div className={home ? 'h-20 lg:hidden' : 'h-[4.5rem] lg:hidden'} aria-hidden="true" />
    </>
  );
}
