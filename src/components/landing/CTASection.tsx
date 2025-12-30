import { Mail, MessageCircle, MapPin, Phone, Clock } from "lucide-react";

export default function CTASection() {
  return (
    <section id="contatti" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
      <div className="space-y-8 sm:space-y-12">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] font-semibold text-accent mb-2 sm:mb-3">
            Contattaci
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-3 sm:mb-4">
            Informazioni e orari
          </h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto mb-6 sm:mb-8">
            Siamo a tua disposizione per qualsiasi informazione
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <a
              href="https://wa.me/393762351777"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] px-4 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-bold text-white transition-all hover:shadow-xl hover:shadow-[#25D366]/30 hover:-translate-y-1"
            >
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
              WhatsApp
            </a>

            <a
              href="mailto:segreteriatennis.gst@gmail.com"
              className="group inline-flex items-center gap-2 rounded-lg sm:rounded-xl accent-gradient px-4 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-bold text-text-dark transition-all hover:shadow-xl hover:shadow-accent-strong/30 hover:-translate-y-1"
            >
              <Mail className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
              Email
            </a>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Location */}
          <article className="group rounded-xl sm:rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-xl p-4 sm:p-5 md:p-6 hover:border-white/40 hover:shadow-xl hover:shadow-cyan-500/20 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="rounded-lg sm:rounded-xl bg-cyan-500/20 border-2 border-cyan-400/40 p-2 sm:p-3 group-hover:scale-110 transition-transform flex-shrink-0">
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-cyan-300 mb-1.5 sm:mb-2 font-bold">
                  Location
                </p>
                <p className="text-sm sm:text-base text-white font-bold mb-0.5 sm:mb-1">VIA CASSIA KM 24300 snc</p>
                <p className="text-xs sm:text-sm text-gray-400">Formello (Roma), Italy</p>
              </div>
            </div>
          </article>

          {/* Contatti */}
          <article className="group rounded-xl sm:rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-xl p-4 sm:p-5 md:p-6 hover:border-white/40 hover:shadow-xl hover:shadow-cyan-500/20 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="rounded-lg sm:rounded-xl bg-cyan-500/20 border-2 border-cyan-400/40 p-2 sm:p-3 group-hover:scale-110 transition-transform flex-shrink-0">
                <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-cyan-300 mb-1.5 sm:mb-2 font-bold">
                  Contatti
                </p>
                <a 
                  href="tel:+393762351777" 
                  className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base text-white font-bold mb-1.5 sm:mb-2 hover:text-cyan-300 transition-colors"
                >
                  <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                  376 235 1777
                </a>
                <a 
                  href="mailto:segreteriatennis.gst@gmail.com" 
                  className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-400 hover:text-cyan-300 transition-colors break-all"
                >
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  segreteriatennis.gst@gmail.com
                </a>
              </div>
            </div>
          </article>

          {/* Orari */}
          <article className="group rounded-xl sm:rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-xl p-4 sm:p-5 md:p-6 hover:border-white/40 hover:shadow-xl hover:shadow-cyan-500/20 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="rounded-lg sm:rounded-xl bg-cyan-500/20 border-2 border-cyan-400/40 p-2 sm:p-3 group-hover:scale-110 transition-transform flex-shrink-0">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-cyan-300 mb-1.5 sm:mb-2 font-bold">
                  Orari
                </p>
                <p className="text-sm sm:text-base text-white font-bold mb-0.5 sm:mb-1">Lun - Sab</p>
                <p className="text-xs sm:text-sm text-gray-400">7:30 - 22:00</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

