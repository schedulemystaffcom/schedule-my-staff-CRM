import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") ?? "created_at";
  const order = searchParams.get("order") ?? "desc";

  const state = searchParams.get("state");
  const practiceType = searchParams.get("practiceType");

  const validSorts = ["name", "created_at", "status"];
  const safeSort = validSorts.includes(sort) ? sort : "created_at";

  let query = supabase.from("practices").select("*");

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (practiceType && practiceType !== "all") {
    query = query.eq("practice_type", practiceType);
  }

  if (state && state !== "all") {
    query = query.ilike("address", `%, ${state} %`);
  }

  const city = searchParams.get("city");
  if (city && city !== "all") {
    query = query.ilike("address", `%, ${city}, %`);
  }

  if (search) {
    // Use ilike for case-insensitive search (PostgreSQL LIKE is case-sensitive)
    query = query.or(
      `name.ilike.%${search}%,address.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  query = query.order(safeSort, { ascending: order === "asc" });

  const { data: practices, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(practices);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) return NextResponse.json({ deleted: 0 });

  const { error, count } = await supabase
    .from("practices")
    .delete({ count: "exact" })
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { data: practice, error } = await supabase
    .from("practices")
    .insert({
      name: body.name,
      phone: body.phone ?? null,
      address: body.address ?? null,
      website: body.website ?? null,
      email: body.email ?? null,
      status: body.status ?? "not_contacted",
      practice_type: body.practice_type ?? "unknown",
      google_place_id: body.google_place_id ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(practice, { status: 201 });
}
