"use client";

import { useEffect, useState } from "react";

export interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
}

export interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  precipitationSum: number;
  hourly: { time: string; temp: number; weatherCode: number }[];
}

const ENDPOINT = "/api/weather";

const CACHE_TTL_MS = 10 * 60 * 1000;
let cache: { ts: number; data: { weather: WeatherData; forecast: ForecastDay[] } } | null = null;

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(cache?.data.weather ?? null);
  const [forecast, setForecast] = useState<ForecastDay[]>(cache?.data.forecast ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
        setWeather(cache.data.weather);
        setForecast(cache.data.forecast);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(ENDPOINT, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (cancelled) return;

        const w: WeatherData | null = data.current
          ? {
              temperature: Math.round(data.current.temperature_2m),
              apparentTemperature: Math.round(data.current.apparent_temperature),
              humidity: data.current.relative_humidity_2m,
              windSpeed: Math.round(data.current.wind_speed_10m),
              weatherCode: data.current.weather_code,
              isDay: data.current.is_day === 1,
            }
          : null;

        let days: ForecastDay[] = [];
        if (data.daily && data.hourly) {
          days = data.daily.time.map((date: string, i: number) => {
            const dayHourly = data.hourly.time
              .map((t: string, hi: number) => ({
                time: t,
                temp: Math.round(data.hourly.temperature_2m[hi]),
                weatherCode: data.hourly.weather_code[hi],
              }))
              .filter((h: { time: string }) => h.time.startsWith(date));
            return {
              date,
              tempMax: Math.round(data.daily.temperature_2m_max[i]),
              tempMin: Math.round(data.daily.temperature_2m_min[i]),
              weatherCode: data.daily.weather_code[i],
              sunrise: data.daily.sunrise[i],
              sunset: data.daily.sunset[i],
              uvIndexMax: Math.round(data.daily.uv_index_max[i]),
              precipitationSum: data.daily.precipitation_sum[i],
              hourly: dayHourly,
            };
          });
        }

        if (w) {
          cache = { ts: Date.now(), data: { weather: w, forecast: days } };
          setWeather(w);
          setForecast(days);
        }
      } catch (error) {
        // Ignore aborted and temporary network errors: WeatherCard already has a fallback UI.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return { weather, forecast, loading };
}
