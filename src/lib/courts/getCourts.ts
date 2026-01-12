import { supabase } from "@/lib/supabase/client";
import { DEFAULT_COURTS } from "./constants";

export type Court = {
  id: string;
  court_name: string;
  display_order: number;
  is_active: boolean;
};

/**
 * Load active courts from database
 * Returns courts ordered by display_order
 */
export async function getCourts(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("courts_settings")
      .select("court_name, display_order, is_active")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error loading courts:", error);
      // Fallback to default courts if database query fails
      return DEFAULT_COURTS;
    }

    if (!data || data.length === 0) {
      // Fallback to default courts if no courts found
      return DEFAULT_COURTS;
    }

    return data.map((court) => court.court_name);
  } catch (error) {
    console.error("Error in getCourts:", error);
    // Fallback to default courts on exception
    return DEFAULT_COURTS;
  }
}

/**
 * Load active courts with full details
 */
export async function getCourtsWithDetails(): Promise<Court[]> {
  try {
    const { data, error } = await supabase
      .from("courts_settings")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error loading courts:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getCourtsWithDetails:", error);
    return [];
  }
}
