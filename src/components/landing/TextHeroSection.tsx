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
    <section className="bg-white pt-4 sm:pt-6 md:pt-8 pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center flex flex-col items-center justify-center">
          <h1 className="!text-6xl sm:!text-8xl md:!text-9xl lg:!text-[10rem] xl:!text-[12rem] font-extrabold mb-4 sm:mb-6 text-secondary leading-tight whitespace-nowrap">
            GST Academy
          </h1>
          <p className="text-base sm:text-base md:text-lg mb-6 sm:mb-8 max-w-3xl mx-auto font-medium text-secondary px-2">
            Campo professionale, maestri certificati e una comunità che ti sprona a vincere. Prenota subito e scopri perché siamo il club preferito della città.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-row flex-nowrap sm:flex-row gap-2 sm:gap-4 mb-8 sm:mb-10 md:mb-12">
            <button
              onClick={handleBookingClick}
              className="inline-flex items-center justify-center px-4 py-3 text-sm sm:px-8 sm:py-4 sm:text-base font-semibold text-white bg-secondary hover:bg-secondary/90 transition-colors rounded-lg whitespace-nowrap"
            >
              Prenota un campo
            </button>
            <button
              onClick={handleTournamentClick}
              className="inline-flex items-center justify-center px-4 py-3 text-sm sm:px-8 sm:py-4 sm:text-base font-semibold text-secondary bg-white hover:bg-gray-50 transition-colors rounded-lg border-2 border-secondary whitespace-nowrap"
            >
              Iscriviti ad un torneo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
