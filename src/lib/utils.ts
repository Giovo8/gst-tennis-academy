import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAvatarUrl(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null;
  
  // Se è già un URL completo, ritornalo così com'è
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // Altrimenti, costruisci l'URL completo con Supabase
  // Usa NEXT_PUBLIC per accesso client-side
  const supabaseUrl = typeof window !== 'undefined' 
    ? process.env.NEXT_PUBLIC_SUPABASE_URL 
    : process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    
  if (!supabaseUrl) {
    console.warn('SUPABASE_URL not found, returning original avatar URL');
    return avatarUrl;
  }
  
  // Se l'URL inizia con /storage/, è già nel formato corretto
  if (avatarUrl.startsWith('/storage/')) {
    return `${supabaseUrl}${avatarUrl}`;
  }
  
  // Altrimenti assumiamo sia un path relativo nella bucket avatars
  return `${supabaseUrl}/storage/v1/object/public/avatars/${avatarUrl}`;
}
