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

    if (role === 'admin' || role === 'gestore') {
      router.push('/dashboard/admin/bookings');
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

    if (role === 'admin' || role === 'gestore') {
      router.push('/dashboard/admin/tornei');
    } else {
      router.push('/dashboard/atleta/tornei');
    }
  };

  return (
    <section className="bg-white pt-24 sm:pt-24 md:pt-24 pb-0 sm:pb-8 md:pb-10 lg:pb-0 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8">
        <div className="text-center flex flex-col items-center justify-center">
          <h1 className="text-[16vw] md:text-[6.5rem] lg:text-[7.5rem] font-extrabold mb-5 sm:mb-6 text-secondary leading-[1.05] tracking-tight">
            <span className="block md:inline">Gioca.</span>{" "}
            <span className="block md:inline">Impara.</span>{" "}
            <span className="block md:inline mt-[0.09em] md:mt-0">Vinci.</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-500 max-w-xs sm:max-w-2xl mb-12 sm:mb-14">
            <span className="text-secondary">Campi</span>, <span className="text-secondary">tornei</span> e <span className="text-secondary">lezioni</span> con maestri certificati FITP: prenota online e scendi in campo.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 mb-12 sm:mb-16 w-full sm:w-auto">
            <button
              onClick={handleBookingClick}
              className="inline-flex items-center justify-center px-6 py-3.5 sm:py-3 text-white bg-secondary rounded-lg shadow-sm hover:bg-secondary/90 transition-all font-medium whitespace-nowrap"
            >
              Prenota un campo
            </button>
            <a
              href="https://wa.me/393762351777"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3.5 sm:py-3 text-white bg-[#023047] rounded-lg shadow-sm hover:bg-[#023047]/90 transition-all font-medium whitespace-nowrap"
            >
              Contattaci
            </a>
          </div>
        </div>
      </div>

      {/* Marquee logos */}
      <div className="w-full pt-6 pb-0">
        <div className="max-w-xl mx-auto overflow-hidden">
          <div className="flex items-center w-max" style={{ animation: 'marquee 30s linear infinite' }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((set) => (
              <div key={set} className="flex items-center flex-shrink-0" style={{ gap: '3rem', paddingRight: '3rem' }}>
                <img src="/images/logo/1729263756_adidas-logo-png-210379511.png" alt="Adidas" style={{ height: '28px', width: 'auto', objectFit: 'contain', flexShrink: 0, filter: 'grayscale(1) opacity(0.45)' }} />
                <img src="/images/logo/Dunlop-logo-4C18C47FBA-seeklogo.com-649631757.png" alt="Dunlop" style={{ height: '24px', width: 'auto', objectFit: 'contain', flexShrink: 0, filter: 'grayscale(1) opacity(0.45)' }} />
                <img src="/images/logo/FITP-LOGO-2501270168.png" alt="FITP" style={{ height: '28px', width: 'auto', objectFit: 'contain', flexShrink: 0, filter: 'grayscale(1) opacity(0.45)' }} />
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center mt-6 sm:mb-10">Powered by</p>
      </div>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
