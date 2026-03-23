import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Returns unique 2-char state codes extracted from practice addresses.
// Google Places addresses end with ", STATE ZIP, USA".
export async function GET() {
  const { data: rows, error } = await supabase
    .from("practices")
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stateSet = new Set<string>();
  for (const row of rows ?? []) {
    if (!row.address || row.address.length <= 15) continue;
    const m = row.address.match(/,\s*([A-Z]{2})\s+\d{5}/);
    if (m) stateSet.add(m[1]);
  }

  const states = Array.from(stateSet).sort();
  return NextResponse.json(states);
}
