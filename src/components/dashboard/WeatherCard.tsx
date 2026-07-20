"use client";

import { useState } from "react";
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  Sun,
  Sunrise,
  Sunset,
  Wind,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useWeather, type ForecastDay } from "@/lib/hooks/useWeather";

const WEATHER_LABELS: Record<number, string> = {
  0: "Sereno",
  1: "Prevalentemente sereno",
  2: "Parzialmente nuvoloso",
  3: "Nuvoloso",
  45: "Nebbia",
  48: "Nebbia con brina",
  51: "Pioggerella leggera",
  53: "Pioggerella",
  55: "Pioggerella intensa",
  61: "Pioggia leggera",
  63: "Pioggia",
  65: "Pioggia intensa",
  71: "Neve leggera",
  73: "Neve",
  75: "Neve intensa",
  80: "Rovesci leggeri",
  81: "Rovesci",
  82: "Rovesci violenti",
  95: "Temporale",
  96: "Temporale con grandine",
  99: "Temporale con grandine",
};

export function getWeatherInfo(code: number, iconClass = "h-12 w-12 sm:h-8 sm:w-8") {
  const label = WEATHER_LABELS[code] || "Sconosciuto";

  let icon;
  if (code <= 1) icon = <Sun className={iconClass} />;
  else if (code <= 48) icon = <Cloud className={iconClass} />;
  else if (code <= 67 || (code >= 80 && code <= 82)) icon = <CloudRain className={iconClass} />;
  else if (code <= 77) icon = <CloudSnow className={iconClass} />;
  else icon = <CloudLightning className={iconClass} />;

  return { label, icon };
}

function formatDayLabel(date: string, index: number) {
  if (index === 0) return "Oggi";
  const d = new Date(`${date}T12:00:00`);
  const label = new Intl.DateTimeFormat("it-IT", { weekday: "short" }).format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

interface WeatherCardProps {
  title?: string;
  subtitle?: string;
}

export default function WeatherCard({
  title = "Tennis Club GST",
  subtitle = "Formello, RM",
}: WeatherCardProps) {
  const { weather, forecast, loading } = useWeather();
  const [expanded, setExpanded] = useState(false);

  const today = forecast[0];
  const canExpand = Boolean(weather);

  // Prossime ore (dati orari, finestra a partire dall'ora corrente)
  const now = Date.now();
  const hours = forecast
    .flatMap((d) => d.hourly)
    .filter((h) => new Date(h.time).getTime() >= now - 60 * 60 * 1000)
    .slice(0, 9);

  // Range globale per scalare le barre delle temperature settimanali
  const globalMin = forecast.length ? Math.min(...forecast.map((d) => d.tempMin)) : 0;
  const globalMax = forecast.length ? Math.max(...forecast.map((d) => d.tempMax)) : 1;

  return (
    <div className="bg-secondary rounded-xl border border-black/10 text-white overflow-hidden">
      <button
        type="button"
        onClick={() => canExpand && setExpanded((v) => !v)}
        disabled={!canExpand}
        aria-expanded={expanded}
        className="w-full flex flex-row items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 text-left disabled:cursor-default enabled:cursor-pointer enabled:hover:bg-white/5 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="text-xs sm:text-sm text-white/80">{subtitle}</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-6 animate-pulse">
            <div className="h-12 w-24 bg-white/20 rounded" />
            <div className="h-8 w-8 bg-white/20 rounded-full" />
          </div>
        ) : weather ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-white">{getWeatherInfo(weather.weatherCode, "h-7 w-7").icon}</div>
            <span className="text-2xl font-bold leading-none">{weather.temperature}°C</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-white/80">
            <Cloud className="h-6 w-6" />
            <p className="text-sm">Meteo non disponibile</p>
          </div>
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && weather && (
          <motion.div
            key="weather-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-white/10">
              {/* Prossime ore */}
              {hours.length > 0 && (
                <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1 sm:mx-0 sm:px-0">
                  {hours.map((h, i) => (
                    <HourCell key={h.time} time={h.time} temp={h.temp} code={h.weatherCode} first={i === 0} />
                  ))}
                </div>
              )}

              {/* Metriche */}
              <div className="mt-3 flex flex-wrap gap-1">
                <Stat icon={<Droplets />} label="Umidità" value={`${weather.humidity}%`} />
                <Stat icon={<Wind />} label="Vento" value={`${weather.windSpeed} km/h`} />
                {today && <Stat icon={<Sun />} label="UV max" value={`${today.uvIndexMax}`} />}
                {today && <Stat icon={<Sunrise />} label="Alba" value={formatTime(today.sunrise)} />}
                {today && <Stat icon={<Sunset />} label="Tramonto" value={formatTime(today.sunset)} />}
              </div>

              {/* Previsioni settimana */}
              {forecast.length > 1 && (
                <div className="mt-3 flex flex-col gap-1">
                  {forecast.map((day, i) => (
                    <ForecastRow
                      key={day.date}
                      day={day}
                      index={i}
                      globalMin={globalMin}
                      globalMax={globalMax}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HourCell({
  time,
  temp,
  code,
  first,
}: {
  time: string;
  temp: number;
  code: number;
  first: boolean;
}) {
  const label = first ? "Ora" : `${new Date(time).getHours()}:00`;
  return (
    <div className="flex items-center gap-2 flex-shrink-0 w-[5.5rem] rounded-lg bg-white/[0.07] px-2.5 py-2 sm:flex-1 sm:w-auto sm:min-w-0">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-white/10 text-white">
        {getWeatherInfo(code, "h-4 w-4").icon}
      </div>
      <div className="min-w-0 leading-tight">
        <span className="block text-xs text-white/60">{label}</span>
        <span className="text-sm font-semibold">{temp}°</span>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-1 basis-[calc(33.333%-0.5rem)] sm:basis-[calc(20%-0.5rem)] items-center gap-2 rounded-lg bg-white/[0.07] px-2.5 py-2">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-white/10 text-white/90 [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-sm font-semibold truncate">{value}</p>
        <p className="text-[0.7rem] text-white/50">{label}</p>
      </div>
    </div>
  );
}

function ForecastRow({
  day,
  index,
  globalMin,
  globalMax,
}: {
  day: ForecastDay;
  index: number;
  globalMin: number;
  globalMax: number;
}) {
  const range = Math.max(globalMax - globalMin, 1);
  const left = ((day.tempMin - globalMin) / range) * 100;
  const width = Math.max(((day.tempMax - day.tempMin) / range) * 100, 6);
  const isToday = index === 0;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/[0.07] px-3 py-2">
      <span
        className={`w-9 text-sm ${isToday ? "font-bold text-white" : "font-medium text-white/80"}`}
      >
        {formatDayLabel(day.date, index)}
      </span>
      <div className="w-5 flex-shrink-0 text-white/90">
        {getWeatherInfo(day.weatherCode, "h-5 w-5").icon}
      </div>
      <span className="w-8 text-right text-sm text-white/50">{day.tempMin}°</span>
      <div className="relative h-1.5 flex-1 rounded-full bg-white/10">
        <div
          className="absolute h-full rounded-full bg-white"
          style={{ left: `${left}%`, width: `${width}%` }}
        />
      </div>
      <span className="w-8 text-sm font-semibold">{day.tempMax}°</span>
    </div>
  );
}
