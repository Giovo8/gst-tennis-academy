"use client";

import React from "react";
import { Instagram, Facebook, Youtube } from "lucide-react";

export default function SocialFeed() {

    return (
      <section id="social" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em] font-semibold text-accent mb-3 sm:mb-4">Social Feed</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-3 sm:mb-4">Seguici sui social</h2>
          <p className="text-sm sm:text-base text-frozen-500 max-w-2xl mx-auto">
            Resta aggiornato su tutte le nostre attività, eventi e successi seguendoci sui nostri canali social
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8">
            <a
              href="https://www.facebook.com/TnnisTimeOut/"
              target="_blank"
              rel="noreferrer"
              aria-label="Segui su Facebook"
              className="group inline-flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/20 to-blue-600/10 backdrop-blur-sm px-4 py-2.5 sm:px-6 sm:py-3.5 text-xs sm:text-base font-bold text-white transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-1"
            >
              <Facebook className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
              Facebook
            </a>

            <a
              href="https://www.instagram.com/gst_tennis/"
              target="_blank"
              rel="noreferrer"
              aria-label="Segui su Instagram"
              className="group inline-flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-purple-600/10 backdrop-blur-sm px-4 py-2.5 sm:px-6 sm:py-3.5 text-xs sm:text-base font-bold text-white transition-all hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/20 hover:-translate-y-1"
            >
              <Instagram className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
              Instagram
            </a>

            <a
              href="#youtube"
              target="_blank"
              rel="noreferrer"
              aria-label="Segui su YouTube"
              className="group inline-flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/20 to-red-600/10 backdrop-blur-sm px-4 py-2.5 sm:px-6 sm:py-3.5 text-xs sm:text-base font-bold text-white transition-all hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/20 hover:-translate-y-1"
            >
              <Youtube className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
              YouTube
            </a>

            <a
              href="https://wa.me/393762351777"
              target="_blank"
              rel="noreferrer"
              aria-label="Contattaci su WhatsApp"
              className="group inline-flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-green-500/30 bg-gradient-to-r from-green-500/20 to-green-600/10 backdrop-blur-sm px-4 py-2.5 sm:px-6 sm:py-3.5 text-xs sm:text-base font-bold text-white transition-all hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-1"
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              WhatsApp
            </a>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-2">
          <div className="rounded-xl sm:rounded-2xl border border-tournament-border/30 bg-tournament-bg-card/60 backdrop-blur-xl overflow-hidden shadow-xl shadow-blue-500/20 w-full">
            <iframe
              title="Facebook Page"
              src={`https://www.facebook.com/plugins/page.php?href=${encodeURIComponent('https://www.facebook.com/TnnisTimeOut/')}&tabs=timeline&width=500&height=650&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`}
              className="w-full"
              height={650}
              style={{ border: 'none', overflow: 'hidden', display: 'block', minWidth: '280px' }}
              scrolling="no"
              frameBorder={0}
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            />
          </div>
        </div>
      </section>
  );
}


