import PartnerBoard from "@/components/announcements/PartnerBoard";

export const metadata = {
  title: "Cerco Socio | GST Tennis Academy",
};

export default function AnnunciPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-12">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9fb6a6]">Annunci</p>
        <h1 className="text-3xl font-semibold text-white">
          Bacheca &quot;Cerco socio&quot;
        </h1>
        <p className="text-sm text-[#c6d8c9]">
          Pubblica un messaggio per trovare giocatori con cui allenarti o fare match.
        </p>
      </div>
      <PartnerBoard />
    </main>
  );
}

