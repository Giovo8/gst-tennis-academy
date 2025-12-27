import { Mail, MessageCircle } from "lucide-react";

export default function CTASection() {
  return (
    <section id="contatti" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2">
            Contattaci
          </p>
          <h2 className="text-2xl font-semibold text-white">
            Informazioni e orari
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://wa.me/393762351777"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>

          <a
            href="mailto:segreteriatennis.gst@gmail.com"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2 mb-3">
            Location
          </p>
          <p className="text-white font-semibold mb-1">VIA CASSIA KM 24300 snc</p>
          <p className="text-sm text-muted">Formello (Roma), Italy</p>
        </article>
        <article className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2 mb-3">
            Contatti
          </p>
          <a href="https://wa.me/393762351777" target="_blank" rel="noopener noreferrer" className="block text-white font-semibold mb-1 hover:text-accent transition">376 235 1777</a>
          <a href="mailto:segreteriatennis.gst@gmail.com" className="block text-sm text-muted hover:text-accent transition">segreteriatennis.gst@gmail.com</a>
        </article>
        <article className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2 mb-3">
            Orari
          </p>
          <p className="text-white font-semibold mb-1">Lun - Sab</p>
          <p className="text-sm text-muted">7:30 - 22:00</p>
        </article>
      </div>
    </section>
  );
}

