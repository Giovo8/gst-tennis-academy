import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const steps: { step: string; status: string; data?: any; error?: string }[] = [];
  
  try {
    // Step 1: Check environment variables
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    
    steps.push({
      step: "1-env",
      status: supabaseUrl && supabaseKey ? "ok" : "missing",
      data: {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        urlLength: supabaseUrl.length,
        keyLength: supabaseKey.length,
      }
    });

    // Step 2: Create Supabase client
    let supabase;
    try {
      supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      steps.push({ step: "2-client", status: "ok" });
    } catch (e: any) {
      steps.push({ step: "2-client", status: "error", error: e.message });
      return NextResponse.json({ steps });
    }

    // Step 3: Parse URL parameters (same as tournaments route)
    try {
      const url = new URL(req.url);
      const upcoming = url.searchParams.get("upcoming");
      steps.push({ 
        step: "3-params", 
        status: "ok",
        data: { upcoming, url: req.url }
      });
    } catch (e: any) {
      steps.push({ step: "3-params", status: "error", error: e.message });
      return NextResponse.json({ steps });
    }

    // Step 4: Test basic query
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title, status")
        .limit(5);
      
      if (error) {
        steps.push({ step: "4-basic-query", status: "error", error: error.message });
      } else {
        steps.push({ 
          step: "4-basic-query", 
          status: "ok",
          data: { count: data?.length, sample: data?.[0] }
        });
      }
    } catch (e: any) {
      steps.push({ step: "4-basic-query", status: "error", error: e.message });
    }

    // Step 5: Test upcoming filter (same as tournaments route)
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .in("status", ["Aperte le Iscrizioni", "In Corso"])
        .order("start_date", { ascending: true });
      
      if (error) {
        steps.push({ step: "5-upcoming-query", status: "error", error: error.message });
      } else {
        steps.push({ 
          step: "5-upcoming-query", 
          status: "ok",
          data: { 
            count: data?.length, 
            tournaments: data?.map(t => ({ id: t.id, title: t.title, status: t.status }))
          }
        });
      }
    } catch (e: any) {
      steps.push({ step: "5-upcoming-query", status: "error", error: e.message });
    }

    // Step 6: Test imports that tournaments route uses
    try {
      const { COMPETITION_TYPE, ERROR_MESSAGES, HTTP_STATUS } = await import("@/lib/constants/app");
      steps.push({ 
        step: "6-constants", 
        status: "ok",
        data: { 
          hasCompetitionType: !!COMPETITION_TYPE,
          hasErrorMessages: !!ERROR_MESSAGES,
          hasHttpStatus: !!HTTP_STATUS
        }
      });
    } catch (e: any) {
      steps.push({ step: "6-constants", status: "error", error: e.message });
    }

    // Step 7: Test sanitize import
    try {
      const { sanitizeObject, sanitizeUuid } = await import("@/lib/security/sanitize");
      steps.push({ 
        step: "7-sanitize", 
        status: "ok",
        data: { 
          hasSanitizeObject: typeof sanitizeObject === 'function',
          hasSanitizeUuid: typeof sanitizeUuid === 'function'
        }
      });
    } catch (e: any) {
      steps.push({ step: "7-sanitize", status: "error", error: e.message });
    }

    // Step 8: Test rate limiter import
    try {
      const { applyRateLimit, RATE_LIMITS, getClientIdentifier } = await import("@/lib/security/rate-limiter");
      steps.push({ 
        step: "8-rate-limiter", 
        status: "ok",
        data: { 
          hasApplyRateLimit: typeof applyRateLimit === 'function',
          hasRateLimits: !!RATE_LIMITS,
          hasGetClientIdentifier: typeof getClientIdentifier === 'function'
        }
      });
    } catch (e: any) {
      steps.push({ step: "8-rate-limiter", status: "error", error: e.message });
    }

    // Step 9: Test validation schema import
    try {
      const { createTournamentSchema } = await import("@/lib/validation/schemas");
      steps.push({ 
        step: "9-validation", 
        status: "ok",
        data: { hasCreateTournamentSchema: !!createTournamentSchema }
      });
    } catch (e: any) {
      steps.push({ step: "9-validation", status: "error", error: e.message });
    }

    return NextResponse.json({ 
      success: true,
      steps,
      timestamp: new Date().toISOString()
    });

  } catch (e: any) {
    return NextResponse.json({ 
      success: false,
      error: e.message,
      stack: e.stack?.substring(0, 1000),
      steps 
    }, { status: 500 });
  }
}
