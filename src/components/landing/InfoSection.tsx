"use client";

import { MapPin, Phone, Clock, Mail } from "lucide-react";

export default function InfoSection() {
  return (
    <section className="bg-gradient-to-b from-gray-900/50 to-transparent border-t border-white/5 py-20">
      <div className="container py-lg">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Location */}
          <div className="group rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-mid/10 to-transparent backdrop-blur-xl p-6 hover:border-[var(--glass-border)] hover:border-opacity-70 hover:shadow-xl hover:shadow-[var(--shadow-glow)] hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-accent-20 p-3 group-hover:scale-110 transition-transform">
                <MapPin className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">La nostra sede</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Via dello Sport, 12<br />
                  20100 Milano (MI)<br />
                  Italy
                </p>
              </div>
            </div>
          </div>

          {/* Contatti */}
          <div className="group rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-mid/10 to-transparent backdrop-blur-xl p-6 hover:border-[var(--glass-border)] hover:border-opacity-70 hover:shadow-xl hover:shadow-[var(--shadow-glow)] hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-accent-20 p-3 group-hover:scale-110 transition-transform">
                <Phone className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Contatti</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <a href="tel:+393762351777" className="flex items-center gap-2 hover:text-accent transition-colors">
                    <Phone className="h-4 w-4" />
                    +39 376 235 1777
                  </a>
                  <a href="mailto:info@gsttennisacademy.it" className="flex items-center gap-2 hover:text-accent transition-colors">
                    <Mail className="h-4 w-4" />
                    info@gsttennisacademy.it
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Orari */}
          <div className="group rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-mid/10 to-transparent backdrop-blur-xl p-6 hover:border-[var(--glass-border)] hover:border-opacity-70 hover:shadow-xl hover:shadow-[var(--shadow-glow)] hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-accent-20 p-3 group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Orari di apertura</h3>
                <div className="space-y-1 text-sm text-gray-300">
                  <p><span className="font-bold text-white">Lun - Ven:</span> 07:00 - 23:00</p>
                  <p><span className="font-bold text-white">Sabato:</span> 08:00 - 22:00</p>
                  <p><span className="font-bold text-white">Domenica:</span> 08:00 - 20:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
