import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Returns unique city names extracted from practice addresses.
// Google Places format: "Street, City, STATE ZIP, USA"
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state");

  let query = supabase.from("practices").select("*");

  if (state && state !== "all") {
    query = query.ilike("address", `%, ${state} %`);
  }

  const { data: rows, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const citySet = new Set<string>();
  for (const row of rows ?? []) {
    if (!row.address) continue;
    // Match ", CITY, STATE ZIP" to extract the city
    const m = row.address.match(/,\s*([^,]+),\s*[A-Z]{2}\s+\d{5}/);
    if (m) citySet.add(m[1].trim());
  }

  const cities = Array.from(citySet).sort();
  return NextResponse.json(cities);
}
