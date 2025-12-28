import { Mail, MessageCircle, MapPin, Phone, Clock } from "lucide-react";

export default function CTASection() {
  return (
    <section id="contatti" className="section py-20">
      <div className="container">
        <div className="section-header flex flex-wrap items-center justify-between gap-6 mb-12">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-blue-400">
              Contattaci
            </p>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-200 to-cyan-300 bg-clip-text text-transparent leading-tight">
              Informazioni e orari
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://wa.me/393762351777"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-xl hover:shadow-[#25D366]/30 hover:-translate-y-1"
            >
              <MessageCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
              WhatsApp
            </a>

            <a
              href="mailto:segreteriatennis.gst@gmail.com"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-1"
            >
              <Mail className="h-5 w-5 group-hover:scale-110 transition-transform" />
              Email
            </a>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Location */}
          <article className="group rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl p-6 hover:border-blue-400/40 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-500/20 p-3 group-hover:scale-110 transition-transform">
                <MapPin className="h-6 w-6 text-blue-300" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-blue-400 mb-2 font-bold">
                  Location
                </p>
                <p className="text-white font-bold mb-1">VIA CASSIA KM 24300 snc</p>
                <p className="text-sm text-gray-400">Formello (Roma), Italy</p>
              </div>
            </div>
          </article>

          {/* Contatti */}
          <article className="group rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl p-6 hover:border-blue-400/40 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-500/20 p-3 group-hover:scale-110 transition-transform">
                <Phone className="h-6 w-6 text-blue-300" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-blue-400 mb-2 font-bold">
                  Contatti
                </p>
                <a 
                  href="tel:+393762351777" 
                  className="flex items-center gap-2 text-white font-bold mb-2 hover:text-blue-300 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  376 235 1777
                </a>
                <a 
                  href="mailto:segreteriatennis.gst@gmail.com" 
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-300 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  segreteriatennis.gst@gmail.com
                </a>
              </div>
            </div>
          </article>

          {/* Orari */}
          <article className="group rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl p-6 hover:border-blue-400/40 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-500/20 p-3 group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6 text-blue-300" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-blue-400 mb-2 font-bold">
                  Orari
                </p>
                <p className="text-white font-bold mb-1">Lun - Sab</p>
                <p className="text-sm text-gray-400">7:30 - 22:00</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

