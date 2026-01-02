"use client";

import Link from "next/link";
import { X, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

type BannerSettings = {
  is_enabled: boolean;
  message: string;
  cta_text: string;
  cta_url: string;
  background_color: string;
};

export default function PromoBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<BannerSettings | null>(null);

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      // Only show banner if user is not logged in
      if (!user) {
        loadSettings();
      }
    });
  }, []);

  async function loadSettings() {
    try {
      const response = await fetch("/api/promo-banner");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        
        if (data.is_enabled) {
          // Check if banner was dismissed
          const dismissed = localStorage.getItem("promo-banner-dismissed");
          if (!dismissed) {
            setIsVisible(true);
          }
        }
      }
    } catch (error) {
      console.error("Error loading promo banner settings:", error);
    }
  }

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("promo-banner-dismissed", "true");
  };

  if (!isVisible || user || !settings) return null;

  const colorThemes = {
    blue: {
      bg: "bg-frozen-600",
      button: "bg-white text-frozen-600 hover:bg-frozen-50",
    },
    green: {
      bg: "bg-frozen-600",
      button: "bg-white text-frozen-500 hover:bg-frozen-50",
    },
    purple: {
      bg: "bg-frozen-600",
      button: "bg-white text-frozen-500 hover:bg-frozen-50",
    },
    red: {
      bg: "bg-frozen-600",
      button: "bg-white text-frozen-500 hover:bg-frozen-50",
    },
  };

  const theme = colorThemes[settings.background_color as keyof typeof colorThemes] || colorThemes.blue;

  return (
    <div className={`relative ${theme.bg} text-white overflow-hidden`}>
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-frozen-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-3 md:gap-4">
          <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse flex-shrink-0" />
          
          <p className="text-sm md:text-base font-semibold text-center">
            {settings.message}
          </p>

          <Link
            href={settings.cta_url}
            className={`flex-shrink-0 px-4 py-1.5 ${theme.button} rounded-full text-sm font-bold transition-all duration-300 hover:scale-105 shadow-lg`}
          >
            {settings.cta_text}
          </Link>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Chiudi banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
