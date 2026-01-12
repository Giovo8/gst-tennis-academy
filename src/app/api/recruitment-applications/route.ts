import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("recruitment_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ applications: data });
  } catch (err: any) {
    console.error("Exception fetching applications:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing required fields: id, status" },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from("recruitment_applications")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Error updating application:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Exception updating application:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from("recruitment_applications")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting application:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Exception deleting application:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
