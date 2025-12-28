"use client";

import React from "react";
import { Instagram, Facebook } from "lucide-react";

export default function SocialFeed() {
  const [embeds, setEmbeds] = React.useState<Array<{ html?: string; url?: string }>|null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        // request recent posts by username gst_tennis
        const res = await fetch('/api/social/instagram?username=gst_tennis');
        const json = await res.json();
        if (!res.ok || !json.ok) {
          // Silently fail - show fallback UI
          setEmbeds([]);
        } else {
          const items = (json.results || []).map((r: any) => ({ html: r.html, url: r.url }));
          if (mounted) setEmbeds(items);
        }
      } catch (err: any) {
        // Silently fail - show fallback UI
        setEmbeds([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // load Instagram embed script when we have url-only results
  React.useEffect(() => {
    if (!embeds) return;
    const hasUrlOnly = embeds.some(e => !!e.url && !e.html);
    if (!hasUrlOnly) return;
    const id = 'instagram-embed-script';
    if (document.getElementById(id)) {
      // process existing embeds
      // @ts-ignore
      if ((window as any).instgrm && (window as any).instgrm.Embeds) (window as any).instgrm.Embeds.process();
      return;
    }
    const s = document.createElement('script');
    s.id = id;
    s.async = true;
    s.defer = true;
    s.src = 'https://www.instagram.com/embed.js';
    s.onload = () => {
      // @ts-ignore
      if ((window as any).instgrm && (window as any).instgrm.Embeds) (window as any).instgrm.Embeds.process();
    };
    document.body.appendChild(s);
  }, [embeds]);

    return (
      <section id="social" className="py-20">
        <div className="container section">
          <div className="section-header space-y-2 mb-12">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] font-semibold text-accent mb-2">Social Feed</p>
                <h2 className="text-4xl font-bold gradient-text leading-tight">Seguici sui social</h2>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="https://www.facebook.com/TnnisTimeOut/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Segui su Facebook"
                  className="group inline-flex items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-gradient-to-r from-accent-mid/20 to-transparent backdrop-blur-sm px-4 py-2 text-sm font-bold text-white transition-all hover:border-[var(--glass-border)] hover:border-opacity-70 hover:shadow-lg hover:shadow-[var(--shadow-glow)] hover:-translate-y-0.5"
                >
                  <Facebook className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  Facebook
                </a>

                <a
                  href="https://www.instagram.com/gst_tennis/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Segui su Instagram"
                  className="group inline-flex items-center gap-2 rounded-xl border border-pink-400/30 bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-sm px-4 py-2 text-sm font-bold text-white transition-all hover:border-pink-400/50 hover:shadow-lg hover:shadow-pink-500/20 hover:-translate-y-0.5"
                >
                  <Instagram className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  Instagram
                </a>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-mid/10 to-transparent backdrop-blur-xl p-6 hover:border-[var(--glass-border)] hover:border-opacity-70 hover:shadow-xl hover:shadow-[var(--shadow-glow)] transition-all">
              <iframe
                title="Facebook Page"
                src={`https://www.facebook.com/plugins/page.php?href=${encodeURIComponent('https://www.facebook.com/TnnisTimeOut/')}&tabs=timeline&width=340&height=500&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true`}
                width="100%"
                height={500}
                style={{ border: 'none', overflow: 'hidden', maxWidth: '100%' }}
                scrolling="no"
                frameBorder={0}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                className="w-full"
              />
            </div>

            <div className="rounded-2xl border border-pink-400/20 bg-gradient-to-br from-pink-500/10 to-purple-500/10 backdrop-blur-xl p-6 hover:border-pink-400/40 hover:shadow-xl hover:shadow-pink-500/20 transition-all">
              {loading && <p className="text-sm text-gray-400">Caricamento Instagram...</p>}

              {!loading && embeds && embeds.length > 0 ? (
                <div className="space-y-4">
                  {embeds.map((it, idx) => (
                    <div key={idx}>
                      {it.html ? (
                        <div className="instagram-embed" dangerouslySetInnerHTML={{ __html: it.html }} />
                      ) : it.url ? (
                        <blockquote className="instagram-media" data-instgrm-permalink={it.url} data-instgrm-version="14">
                          <a href={it.url}>{it.url}</a>
                        </blockquote>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : !loading ? (
                <div className="text-center">
                  <Instagram className="h-12 w-12 mx-auto mb-4 text-pink-300/60" />
                  <p className="text-lg font-bold bg-gradient-to-r from-pink-200 to-purple-300 bg-clip-text text-transparent mb-2">Seguici su Instagram!</p>
                  <p className="text-sm text-gray-400 mb-6">Segui il profilo Instagram ufficiale per gli ultimi post.</p>

                  <a
                    href="https://www.instagram.com/gst_tennis/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Apri Instagram gst_tennis"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-xl hover:shadow-pink-500/30 hover:-translate-y-1"
                  >
                    <Instagram className="h-5 w-5" />
                    Vai su Instagram
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
  );
}


