import PartnerBoard from "@/components/announcements/PartnerBoard";
import { Users } from "lucide-react";

export const metadata = {
  title: "Cerco Socio | GST Tennis Academy",
};

export default function AnnunciPage() {
  return (
    <main className="min-h-screen bg-[#021627]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/4 top-20 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl animate-pulse" style={{animationDuration: '4s'}} />
          <div className="absolute right-1/4 top-10 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" style={{animationDuration: '6s', animationDelay: '2s'}} />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 pt-12 sm:pt-20 pb-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-purple-400">
              <Users className="h-4 w-4" />
              Bacheca Community
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
              <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                Cerco Socio
              </span>
            </h1>
            <p className="text-lg text-white/60 max-w-xl">
              Pubblica un messaggio per trovare giocatori con cui allenarti o fare match. 
              Connettiti con la community di GST Academy!
            </p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="mx-auto max-w-7xl px-6 sm:px-8 pb-20">
        <PartnerBoard />
      </div>
    </main>
  );
}

