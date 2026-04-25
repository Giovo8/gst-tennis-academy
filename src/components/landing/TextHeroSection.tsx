"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function TextHeroSection() {
  const router = useRouter();

  const handleBookingClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login?redirect=/dashboard/bookings');
      return;
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'atleta';

    if (role === 'admin') {
      router.push('/dashboard/admin/bookings');
    } else if (role === 'gestore') {
      router.push('/dashboard/gestore/bookings');
    } else {
      router.push('/dashboard/atleta/bookings');
    }
  };

  const handleTournamentClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login?redirect=/dashboard/tornei');
      return;
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'atleta';

    if (role === 'admin') {
      router.push('/dashboard/admin/tornei');
    } else if (role === 'gestore') {
      router.push('/dashboard/gestore/tornei');
    } else {
      router.push('/dashboard/atleta/tornei');
    }
  };

  return (
    <section className="bg-white pt-16 sm:pt-24 md:pt-32 pb-12 sm:pb-16 md:pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center flex flex-col items-center justify-center">
          <h1 className="!text-[2.75rem] sm:!text-8xl md:!text-9xl lg:!text-[10rem] xl:!text-[12rem] font-extrabold mb-10 sm:mb-14 text-secondary leading-[0.92] tracking-tight whitespace-nowrap">
            GST Academy
          </h1>

          {/* CTA Buttons */}
          <div className="flex flex-row flex-wrap justify-center gap-3 sm:gap-4">
            <button
              onClick={handleBookingClick}
              className="inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-white bg-secondary hover:bg-secondary/90 transition-all rounded-full whitespace-nowrap hover:-translate-y-0.5"
            >
              Prenota un campo
            </button>
            <button
              onClick={handleTournamentClick}
              className="inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-secondary bg-white hover:bg-gray-50 transition-all rounded-full border border-secondary whitespace-nowrap hover:-translate-y-0.5"
            >
              Iscriviti ad un torneo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
