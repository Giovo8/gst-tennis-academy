import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Step 1: Test env module
    let envStatus = "not tested";
    try {
      const env = (await import("@/lib/config/env")).default;
      envStatus = `ok - url: ${env.supabaseUrl ? "set" : "missing"}, key: ${env.supabaseServiceRoleKey ? "set" : "missing"}`;
    } catch (e: any) {
      envStatus = `error: ${e.message}`;
    }

    // Step 2: Test logger module
    let loggerStatus = "not tested";
    try {
      const logger = (await import("@/lib/logger/secure-logger")).default;
      loggerStatus = "ok";
    } catch (e: any) {
      loggerStatus = `error: ${e.message}`;
    }

    // Step 3: Test supabase client
    let supabaseStatus = "not tested";
    try {
      const { supabaseServer } = await import("@/lib/supabase/serverClient");
      supabaseStatus = supabaseServer ? "ok - client created" : "null client";
    } catch (e: any) {
      supabaseStatus = `error: ${e.message}\n${e.stack?.substring(0, 500)}`;
    }

    // Step 4: Test actual query
    let queryStatus = "not tested";
    try {
      const { supabaseServer } = await import("@/lib/supabase/serverClient");
      const { data, error } = await supabaseServer
        .from("tournaments")
        .select("id,title,status")
        .limit(1);
      if (error) {
        queryStatus = `query error: ${error.message}`;
      } else {
        queryStatus = `ok - found ${data?.length ?? 0} tournaments`;
      }
    } catch (e: any) {
      queryStatus = `error: ${e.message}`;
    }

    // Step 5: Test direct createClient (bypass env module)
    let directStatus = "not tested";
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await client.from("tournaments").select("id,title,status").limit(1);
      if (error) {
        directStatus = `query error: ${error.message}`;
      } else {
        directStatus = `ok - found ${data?.length ?? 0} tournaments`;
      }
    } catch (e: any) {
      directStatus = `error: ${e.message}`;
    }

    return NextResponse.json({
      env: envStatus,
      logger: loggerStatus,
      supabase: supabaseStatus,
      query: queryStatus,
      direct: directStatus,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack?.substring(0, 500) }, { status: 500 });
  }
}
