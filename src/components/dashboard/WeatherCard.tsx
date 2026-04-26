"use client";

import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { useWeather } from "@/lib/hooks/useWeather";

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

interface WeatherCardProps {
  title?: string;
  subtitle?: string;
}

export default function WeatherCard({
  title = "Tennis Club GST",
  subtitle = "Formello, RM",
}: WeatherCardProps) {
  const { weather, loading } = useWeather();

  return (
    <div className="bg-secondary rounded-xl p-5 text-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg sm:text-lg">{title}</h3>
          <p className="text-xs sm:text-sm text-white/80">{subtitle}</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-6 animate-pulse">
            <div className="h-12 w-24 bg-white/20 rounded" />
            <div className="h-8 w-8 bg-white/20 rounded-full" />
          </div>
        ) : weather ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 flex-shrink-0">
            <div className="sm:hidden flex items-center justify-between gap-4 w-full">
              <div className="text-left">
                <div className="text-4xl font-bold leading-none mb-1">{weather.temperature}°C</div>
                <p className="text-sm text-white/90">{getWeatherInfo(weather.weatherCode).label}</p>
              </div>
              <div className="text-white flex-shrink-0">
                {getWeatherInfo(weather.weatherCode).icon}
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-4">
              <div className="text-left">
                <div className="text-4xl font-bold">{weather.temperature}°C</div>
                <p className="text-sm text-white/90">{getWeatherInfo(weather.weatherCode).label}</p>
              </div>
              <div className="text-white">{getWeatherInfo(weather.weatherCode).icon}</div>
            </div>

            <div className="hidden sm:flex items-center gap-4 pl-6 border-l border-white/20">
              <WeatherDetail icon={<Thermometer className="h-5 w-5 mx-auto mb-1 text-white/80" />} label="Percepita" value={`${weather.apparentTemperature}°C`} />
              <WeatherDetail icon={<Droplets className="h-5 w-5 mx-auto mb-1 text-white/80" />} label="Umidità" value={`${weather.humidity}%`} />
              <WeatherDetail icon={<Wind className="h-5 w-5 mx-auto mb-1 text-white/80" />} label="Vento" value={`${weather.windSpeed} km/h`} />
            </div>

            <div className="sm:hidden grid grid-cols-3 gap-3 w-full pt-2 border-t border-white/20">
              <WeatherDetail icon={<Thermometer className="h-5 w-5 mx-auto mb-1 text-white/80" />} label="Percepita" value={`${weather.apparentTemperature}°C`} />
              <WeatherDetail icon={<Droplets className="h-5 w-5 mx-auto mb-1 text-white/80" />} label="Umidità" value={`${weather.humidity}%`} />
              <WeatherDetail icon={<Wind className="h-5 w-5 mx-auto mb-1 text-white/80" />} label="Vento" value={`${weather.windSpeed} km/h`} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-white/80">
            <Cloud className="h-6 w-6" />
            <p className="text-sm">Meteo non disponibile</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WeatherDetail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="text-center">
      {icon}
      <p className="text-xs text-white/70">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
