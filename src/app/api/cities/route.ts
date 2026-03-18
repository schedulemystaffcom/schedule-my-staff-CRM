import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Returns unique city names extracted from practice addresses.
// Google Places format: "Street, City, STATE ZIP, USA"
// The city is the segment immediately before ", STATE ZIP".
export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state");

  let query = `SELECT DISTINCT address FROM practices WHERE address IS NOT NULL`;
  const params: unknown[] = [];

  if (state && state !== "all") {
    query += ` AND address LIKE ?`;
    params.push(`%, ${state} %`);
  }

  const rows = db.prepare(query).all(...params) as { address: string }[];

  const citySet = new Set<string>();
  for (const { address } of rows) {
    // Match ", CITY, STATE ZIP" to extract the city
    const m = address.match(/,\s*([^,]+),\s*[A-Z]{2}\s+\d{5}/);
    if (m) citySet.add(m[1].trim());
  }

  const cities = Array.from(citySet).sort();
  return NextResponse.json(cities);
}
