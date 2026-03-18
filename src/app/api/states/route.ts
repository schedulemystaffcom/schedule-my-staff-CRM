import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Returns unique 2-char state codes extracted from practice addresses.
// Google Places addresses end with ", STATE ZIP, USA" so the state is
// reliably at SUBSTR(address, LENGTH(address) - 12, 2).
export async function GET() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT DISTINCT SUBSTR(address, LENGTH(address) - 12, 2) AS state
    FROM practices
    WHERE address IS NOT NULL AND LENGTH(address) > 15
    ORDER BY state
  `).all() as { state: string }[];

  const states = rows
    .map((r) => r.state?.trim())
    .filter((s): s is string => !!s && /^[A-Z]{2}$/.test(s));

  return NextResponse.json(states);
}
