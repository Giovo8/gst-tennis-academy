import { NextResponse } from 'next/server';

// GET /api/social/instagram
// Reads env:
// - INSTAGRAM_OEMBED_TOKEN : Facebook app access token for the instagram oEmbed endpoint
// - INSTAGRAM_POST_URLS : optional comma separated list of instagram post URLs to fetch

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = process.env.INSTAGRAM_OEMBED_TOKEN || process.env.FACEBOOK_APP_ACCESS_TOKEN;
    const postsEnv = process.env.INSTAGRAM_POST_URLS;
    const queryUsername = url.searchParams.get('username');

    // token optional: if not present we will attempt to scrape recent posts by username
    // however scraping may be brittle and can break if Instagram changes their markup.

    const urls: string[] = [];
    if (postsEnv) {
      urls.push(...postsEnv.split(',').map(s => s.trim()).filter(Boolean));
    }

    // If client requested a single post url
    const qUrl = url.searchParams.get('url');
    if (qUrl) urls.unshift(qUrl);

    if (urls.length === 0) {
      // Try to scrape recent posts by username if provided and no token available
      if (queryUsername) {
        const scraped = await (async function fetchRecentByUsername(username: string) {
          try {
            // Try the JSON endpoint first
            const jsonEndpoint = `https://www.instagram.com/${encodeURIComponent(username)}/?__a=1`;
            let res = await fetch(jsonEndpoint, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (res.ok) {
              const data = await res.json();
              // traverse to media edges (best-effort for common schema)
              const edges = ((data.graphql && data.graphql.user && data.graphql.user.edge_owner_to_timeline_media && data.graphql.user.edge_owner_to_timeline_media.edges) ||
                (data.items)) as any[] | undefined;
              if (edges && edges.length) {
                return edges.slice(0, 6).map((e: any) => {
                  const shortcode = e.shortcode || (e.code || (e.id ? String(e.id) : null));
                  return shortcode ? `https://www.instagram.com/p/${shortcode}/` : null;
                }).filter(Boolean) as string[];
              }
            }

            // Fallback: fetch HTML and extract shortcodes via regex
            res = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (!res.ok) return [];
            const html = await res.text();
            const matches = Array.from(html.matchAll(/"shortcode":"([A-Za-z0-9_-]{5,})"/g));
            const seen = new Set<string>();
            const shortcodes: string[] = [];
            for (const m of matches) {
              const sc = m[1];
              if (!seen.has(sc)) {
                seen.add(sc);
                shortcodes.push(sc);
              }
              if (shortcodes.length >= 6) break;
            }
            return shortcodes.map(s => `https://www.instagram.com/p/${s}/`);
          } catch (e) {
            return [];
          }
        })(queryUsername);

        if (scraped && scraped.length > 0) {
          urls.push(...scraped);
        }
      }

      if (urls.length === 0) {
        return NextResponse.json({ ok: false, message: 'No post URLs configured. Set INSTAGRAM_POST_URLS, pass ?url=... or ?username=...' }, { status: 400 });
      }
    }

    // Fetch oEmbed for each URL
    const results = await Promise.all(urls.map(async (postUrl) => {
      // If we have a token, prefer oEmbed HTML
      if (token) {
        try {
          const endpoint = `https://graph.facebook.com/v17.0/instagram_oembed?url=${encodeURIComponent(postUrl)}&access_token=${encodeURIComponent(token)}`;
          const res = await fetch(endpoint);
          if (!res.ok) {
            const text = await res.text();
            return { ok: false, url: postUrl, status: res.status, text };
          }
          const data = await res.json();
          return { ok: true, url: postUrl, html: data.html };
        } catch (err: any) {
          return { ok: false, url: postUrl, error: err.message };
        }
      }

      // No token: return the post URL so client can render a blockquote fallback
      return { ok: true, url: postUrl };
    }));

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
