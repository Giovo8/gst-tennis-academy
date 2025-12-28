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
      <section id="social">
        <div className="container section">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-2">Social Feed</p>
              <h2 className="text-2xl font-semibold text-white">Seguici sui social</h2>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="https://www.facebook.com/TnnisTimeOut/"
                target="_blank"
                rel="noreferrer"
                aria-label="Segui su Facebook"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
              >
                <Facebook className="h-4 w-4" />
                Facebook
              </a>

              <a
                href="https://www.instagram.com/gst_tennis/"
                target="_blank"
                rel="noreferrer"
                aria-label="Segui su Instagram"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
              >
                <Instagram className="h-4 w-4" />
                Instagram
              </a>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
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

            <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
              {loading && <p className="text-sm text-muted">Caricamento Instagram...</p>}

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
                  <Instagram className="h-12 w-12 mx-auto mb-4 text-white/30" />
                  <p className="text-lg font-semibold text-white mb-2">Seguici su Instagram!</p>
                  <p className="text-sm text-muted mb-6">Segui il profilo Instagram ufficiale per gli ultimi post.</p>

                  <a
                    href="https://www.instagram.com/gst_tennis/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Apri Instagram gst_tennis"
                    className="inline-flex items-center gap-2 rounded-full bg-[#2f7de1] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2563c7]"
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


