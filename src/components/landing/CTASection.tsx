"use client";

import { Mail, MessageCircle, MapPin, Phone, Clock, Send, User, MessageSquare } from "lucide-react";
import { useState } from "react";

export default function CTASection() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reset form
    setFormData({ name: "", email: "", message: "" });
    setIsSubmitting(false);
    alert("Messaggio inviato! Ti risponderemo al più presto.");
  };

  return (
    <section id="contatti" className="relative overflow-hidden py-16 sm:py-20 md:py-28 bg-gray-50">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50"></div>
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-block mb-4">
            <span className="text-xs sm:text-sm uppercase tracking-[0.3em] font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Parliamone
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4 sm:mb-6">
            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              Siamo qui per te
            </span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Hai domande? Vuoi prenotare una lezione o iscriverti a un torneo? 
            <span className="text-cyan-600 font-semibold"> Contattaci subito!</span>
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Left Column - Contact Info & Quick Actions */}
          <div className="space-y-6">
            {/* Quick Contact Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href="https://wa.me/393762351777"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] p-6 text-white transition-all hover:scale-105 hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center gap-4">
                  <div className="rounded-xl bg-white/20 p-3 group-hover:rotate-12 transition-transform">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold opacity-90">Chatta con noi</p>
                    <p className="text-lg font-bold">WhatsApp</p>
                  </div>
                </div>
              </a>

              <a
                href="mailto:segreteriatennis.gst@gmail.com"
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-6 text-white transition-all hover:scale-105 hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center gap-4">
                  <div className="rounded-xl bg-white/20 p-3 group-hover:rotate-12 transition-transform">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold opacity-90">Scrivici una</p>
                    <p className="text-lg font-bold">Email</p>
                  </div>
                </div>
              </a>
            </div>

            {/* Info Cards */}
            <div className="space-y-4">
              {/* Location */}
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-cyan-300 hover:shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="relative rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-3">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-600 mb-2">
                      Dove siamo
                    </h3>
                    <p className="text-lg font-bold text-gray-900 mb-1">Via Cassia KM 24300 snc</p>
                    <p className="text-sm text-gray-600">Formello (Roma), Italia</p>
                    <a 
                      href="https://maps.google.com/?q=Via+Cassia+KM+24300+Formello+Roma"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700 font-semibold mt-2 group/link"
                    >
                      Apri in Maps
                      <span className="group-hover/link:translate-x-1 transition-transform">→</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-cyan-300 hover:shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="relative rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-3">
                      <Phone className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-600 mb-2">
                      Contatti diretti
                    </h3>
                    <a 
                      href="tel:+393762351777" 
                      className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-cyan-600 transition-colors mb-2 group/phone"
                    >
                      <Phone className="h-4 w-4 group-hover/phone:animate-bounce" />
                      376 235 1777
                    </a>
                    <a 
                      href="mailto:segreteriatennis.gst@gmail.com" 
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-cyan-600 transition-colors break-all group/email"
                    >
                      <Mail className="h-4 w-4 flex-shrink-0 group-hover/email:animate-bounce" />
                      segreteriatennis.gst@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Hours */}
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-cyan-300 hover:shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="relative rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-3">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-600 mb-2">
                      Orari di apertura
                    </h3>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-gray-900">Lunedì - Sabato</p>
                      <p className="text-lg font-bold text-cyan-600">7:30 - 22:00</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Domenica chiuso</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Contact Form */}
          <div className="relative">
            <div className="sticky top-8">
              <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="relative">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Inviaci un messaggio</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Compila il form e ti risponderemo entro 24 ore
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name Input */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                        Nome e Cognome
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          id="name"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-12 py-3.5 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                          placeholder="Mario Rossi"
                        />
                      </div>
                    </div>

                    {/* Email Input */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          id="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-12 py-3.5 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                          placeholder="mario.rossi@email.com"
                        />
                      </div>
                    </div>

                    {/* Message Textarea */}
                    <div>
                      <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                        Messaggio
                      </label>
                      <div className="relative">
                        <MessageSquare className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                        <textarea
                          id="message"
                          required
                          rows={4}
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-12 py-3.5 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
                          placeholder="Come possiamo aiutarti?"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 p-4 font-bold text-white transition-all hover:scale-[1.02] hover:shadow-xl hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <span className="relative flex items-center justify-center gap-2">
                        {isSubmitting ? (
                          <>
                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Invio in corso...
                          </>
                        ) : (
                          <>
                            Invia Messaggio
                            <Send className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </span>
                    </button>
                  </form>

                  <p className="text-xs text-gray-500 text-center mt-6">
                    Rispondiamo solitamente entro 24 ore nei giorni lavorativi
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

