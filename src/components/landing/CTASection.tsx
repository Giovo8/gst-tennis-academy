import Link from "next/link";

export default function CTASection() {
  return (
    <section id="contatti" className="rounded-3xl border border-white/10 bg-hero-gradient p-8 sm:p-10">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
        <div className="flex-1 space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2">
            Contattaci
          </p>
          <h2 className="text-3xl font-bold text-white leading-tight">
            Lezioni private, prenotazione campi e corsi tennis
          </h2>
          <p className="text-base leading-relaxed text-muted max-w-xl">
            Prenota il tuo campo per match e allenamenti, scegli lezioni private
            con i nostri maestri qualificati o iscriviti ai corsi di gruppo.
            Contattaci per trovare la soluzione perfetta per te!
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:shrink-0">
          <a
            href="https://wa.me/393762351777"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5 whitespace-nowrap"
          >
            Scrivi su WhatsApp
          </a>
          <a
            href="mailto:segreteriatennis.gst@gmail.com"
            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold bg-[#2f7de1] text-white shadow-accent transition hover:bg-[#2563c7] whitespace-nowrap"
          >
            Scrivici una Email
          </a>
        </div>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-5 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-[#9fb6a6] mb-3">
            Location
          </p>
          <p className="text-white font-semibold mb-1">VIA CASSIA KM 24300 snc</p>
          <p className="text-muted">Formello (Roma), Italy</p>
        </div>
        <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-5 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-[#9fb6a6] mb-3">
            Contatti
          </p>
          <p className="text-white font-semibold mb-1">376 235 1777</p>
          <p className="text-muted">segreteriatennis.gst@gmail.com</p>
        </div>
        <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-5 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-[#9fb6a6] mb-3">
            Orari
          </p>
          <p className="text-white font-semibold mb-1">Lun - Sab</p>
          <p className="text-muted">7:30 - 22:00</p>
        </div>
      </div>
    </section>
  );
}

