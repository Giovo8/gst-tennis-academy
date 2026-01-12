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
    <section className="bg-white pt-8 sm:pt-12 md:pt-16 lg:pt-20 pb-4 sm:pb-6 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center flex flex-col items-center justify-center">
          <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[10rem] font-extrabold mb-3 sm:mb-4 md:mb-6 text-secondary leading-tight">
            GST Academy
          </h1>
          <p className="text-sm sm:text-base md:text-lg mb-5 sm:mb-6 md:mb-8 max-w-2xl mx-auto font-medium text-secondary/90 px-3 sm:px-4 leading-relaxed">
            Campo professionale, maestri certificati e una comunità che ti sprona a vincere. Prenota subito e scopri perché siamo il club preferito della città.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md sm:max-w-none px-2 sm:px-0">
            <button
              onClick={handleBookingClick}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-white bg-secondary hover:bg-secondary/90 transition-all rounded-lg shadow-sm hover:shadow-md"
            >
              Prenota un campo
            </button>
            <button
              onClick={handleTournamentClick}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-secondary bg-white hover:bg-gray-50 transition-all rounded-lg border-2 border-secondary shadow-sm hover:shadow-md"
            >
              Iscriviti ad un torneo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
