import { NextResponse } from "next/server";
import { applyRateLimit, RATE_LIMITS, getClientIdentifier } from "@/lib/security/rate-limiter";

export const revalidate = 300; // Cache per 5 minuti

const OPEN_METEO_ENDPOINT =
  "https://api.open-meteo.com/v1/forecast?latitude=42.07631852280004&longitude=12.373061355799356&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,uv_index_max,precipitation_sum&hourly=temperature_2m,weather_code&timezone=Europe%2FRome&forecast_days=7";

export async function GET(req: Request) {
  try {
    const clientId = getClientIdentifier(req);
    const rateLimit = await applyRateLimit(clientId, RATE_LIMITS.API_READ);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Troppe richieste, riprova più tardi", retryAfter: rateLimit.reset },
        { status: 429 }
      );
    }

    const response = await fetch(OPEN_METEO_ENDPOINT, {
      next: { revalidate: 300 },
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Weather provider unavailable" },
        { status: 502 }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load weather" },
      { status: 502 }
    );
  }
}