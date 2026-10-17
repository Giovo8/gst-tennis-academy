import { NextResponse } from 'next/server';
import { applyRateLimit, RATE_LIMITS, getClientIdentifier } from '@/lib/security/rate-limiter';
import {
  normalizeScoreboard,
  romeDay,
  type EspnScoreboard,
  type LiveMatch,
  type LiveTour,
} from '@/lib/live-tennis/espn';

const ESPN_SCOREBOARD = (tour: string, day: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/tennis/${tour}/scoreboard?dates=${day.replace(
    /-/g,
    '',
  )}`;

const TOURS: LiveTour[] = ['ATP', 'WTA'];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

async function loadTour(tour: LiveTour, day: string): Promise<LiveMatch[]> {
  const response = await fetch(ESPN_SCOREBOARD(tour.toLowerCase(), day), {
    next: { revalidate: 30 },
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`ESPN ${tour} ${response.status}`);
  const data = (await response.json()) as EspnScoreboard;
  return normalizeScoreboard(data, tour, day);
}

// GET /api/live-tennis?date=YYYY-MM-DD - Partite ATP/WTA del giorno (ora italiana) + quelle in corso (pubblico)
export async function GET(req: Request) {
  try {
    const clientId = getClientIdentifier(req);
    const rateLimit = await applyRateLimit(clientId, RATE_LIMITS.API_READ);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Troppe richieste, riprova più tardi', retryAfter: rateLimit.reset },
        { status: 429 },
      );
    }

    const requested = new URL(req.url).searchParams.get('date');
    if (requested && (!DAY_RE.test(requested) || Number.isNaN(Date.parse(requested)))) {
      return NextResponse.json({ error: 'Data non valida' }, { status: 400 });
    }
    const day = requested ?? romeDay(Date.now());

    const results = await Promise.allSettled(TOURS.map((tour) => loadTour(tour, day)));
    if (results.every((r) => r.status === 'rejected')) {
      return NextResponse.json({ error: 'Live score provider unavailable' }, { status: 502 });
    }

    // In corso in cima, poi in ordine di orario (come livescore)
    const matches = results
      .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      .sort((a, b) => {
        if ((a.state === 'live') !== (b.state === 'live')) return a.state === 'live' ? -1 : 1;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });

    return NextResponse.json(
      { date: day, matches, updatedAt: new Date().toISOString() },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30' },
      },
    );
  } catch {
    return NextResponse.json({ error: 'Failed to load live scores' }, { status: 502 });
  }
}
