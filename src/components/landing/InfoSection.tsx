"use client";

import { MapPin, Phone, Clock, Mail } from "lucide-react";

export default function InfoSection() {
  return (
    <section className="bg-[#0a1526] border-t border-white/5">
      <div className="container py-lg">
        <div className="grid gap-lg md:grid-cols-3">
          {/* Location */}
          <div className="rounded-2xl border border-[#2f7de1]/20 bg-[#071022] p-6 hover:border-[#2f7de1]/40 transition-colors">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-accent-15 p-3">
                <MapPin className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">La nostra sede</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Via dello Sport, 12<br />
                  20100 Milano (MI)<br />
                  Italy
                </p>
              </div>
            </div>
          </div>

          {/* Contatti */}
          <div className="rounded-2xl border border-[#2f7de1]/20 bg-[#071022] p-6 hover:border-[#2f7de1]/40 transition-colors">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-accent-15 p-3">
                <Phone className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Contatti</h3>
                <div className="space-y-2 text-sm text-muted">
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
          <div className="rounded-2xl border border-[#2f7de1]/20 bg-[#071022] p-6 hover:border-[#2f7de1]/40 transition-colors">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-accent-15 p-3">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Orari di apertura</h3>
                <div className="space-y-1 text-sm text-muted">
                  <p><span className="font-medium text-white">Lun - Ven:</span> 07:00 - 23:00</p>
                  <p><span className="font-medium text-white">Sabato:</span> 08:00 - 22:00</p>
                  <p><span className="font-medium text-white">Domenica:</span> 08:00 - 20:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
