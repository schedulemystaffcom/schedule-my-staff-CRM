import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { resolveStateCode, STATE_NAMES, STATE_CITIES } from "@/lib/stateCities";

const PLACES_API_BASE = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.types",
  "nextPageToken",
].join(",");

interface PlacesResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  types?: string[];
}

interface PlacesResponse {
  places?: PlacesResult[];
  nextPageToken?: string;
}

async function fetchPlacesPage(
  query: string,
  apiKey: string,
  pageToken?: string
): Promise<PlacesResponse> {
  const body: Record<string, unknown> = { textQuery: query, maxResultCount: 20 };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch(PLACES_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Places API error ${res.status}: ${text}`);
  }

  return res.json();
}

async function fetchAllPages(query: string, apiKey: string): Promise<PlacesResult[]> {
  const places: PlacesResult[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 3; page++) {
    const data = await fetchPlacesPage(query, apiKey, pageToken);
    if (data.places) places.push(...data.places);
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
    if (page < 2) await new Promise((r) => setTimeout(r, 500));
  }
  return places;
}

export async function POST(req: NextRequest) {
  const { location, deepScan, stateMode } = await req.json();

  if (!location || typeof location !== "string" || !location.trim()) {
    return NextResponse.json(
      { error: "A city name or zip code is required." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY is not set in .env.local" },
      { status: 500 }
    );
  }

  const db = getDb();
  const searchedQueries = new Set<string>();
  const allPlaces: PlacesResult[] = [];

  const runSearch = async (query: string) => {
    if (searchedQueries.has(query)) return;
    searchedQueries.add(query);
    const results = await fetchAllPages(query, apiKey);
    allPlaces.push(...results);
  };

  // Expand zip codes discovered so far, optionally restricted to a specific state
  const expandByZip = async (onlyStateCode?: string) => {
    const zips = new Set<string>();
    for (const place of allPlaces) {
      const addr = place.formattedAddress ?? "";
      // If a state filter is given, skip addresses that don't belong to that state
      if (onlyStateCode) {
        const stateInAddr = addr.match(/,\s*([A-Z]{2})\s+\d{5}/)?.[1];
        if (stateInAddr && stateInAddr !== onlyStateCode) continue;
      }
      const m = addr.match(/\b(\d{5})\b/);
      if (m) zips.add(m[1]);
    }
    for (const zip of zips) {
      await runSearch(`orthodontist in ${zip}`);
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  // ── State-wide mode ──────────────────────────────────────────────────────
  const stateCode = stateMode ? resolveStateCode(location.trim()) : null;

  if (stateCode) {
    const stateName = STATE_NAMES[stateCode];
    const cities = STATE_CITIES[stateCode] ?? [];

    // Search every major city in the state
    for (const city of cities) {
      await runSearch(`orthodontist in ${city}, ${stateName}`);
      await new Promise((r) => setTimeout(r, 300));
    }

    // Then expand by every zip code discovered — only within this state
    await expandByZip(stateCode);

  } else {
    // ── City / Zip mode ───────────────────────────────────────────────────
    // Step 1: initial city/zip search
    await runSearch(`orthodontist in ${location.trim()}`);

    // Step 2 (deep scan): extract zip codes from results and search each one
    if (deepScan) {
      await expandByZip(); // no state restriction for manual city/zip deep scans
    }
  }

  // For state-mode searches, drop any result whose address is outside the target state.
  // This catches border-city results Google returns from neighboring states.
  const stateFiltered = stateCode
    ? allPlaces.filter((place) => {
        const addr = place.formattedAddress ?? "";
        const stateInAddr = addr.match(/,\s*([A-Z]{2})\s+\d{5}/)?.[1];
        return !stateInAddr || stateInAddr === stateCode;
      })
    : allPlaces;

  // Filter out non-orthodontist practices by name.
  // The search query "orthodontist in X" does most of the work — this blocklist
  // catches the obvious misfires (dentists, endodontists, etc.) that Google includes.
  // Names containing "ortho" are always kept regardless of other keywords.
  const NON_ORTHO_KEYWORDS = [
    "endodontic", "endodontist",
    "periodontic", "periodontist",
    "denture", "denturist",
    "oral surgery", "oral surgeon",
    "family dentist", "family dental",
    "general dentist", "general dental",
    "pediatric dent", "kids dent", "children's dent",
    "cosmetic dentist",
    "dental implant",
  ];

  const orthodontistsOnly = stateFiltered.filter((place) => {
    const name = (place.displayName?.text ?? "").toLowerCase();
    // Always keep anything with "ortho" in the name
    if (name.includes("ortho")) return true;
    // Drop clear non-orthodontist practices
    if (NON_ORTHO_KEYWORDS.some((kw) => name.includes(kw))) return false;
    // Ambiguous name — trust that the "orthodontist in X" search was accurate
    return true;
  });

  // Deduplicate the raw results by google_place_id before inserting
  const seen = new Map<string, PlacesResult>();
  for (const place of orthodontistsOnly) {
    const key = place.id ?? place.nationalPhoneNumber ?? place.displayName?.text ?? Math.random().toString();
    if (!seen.has(key)) seen.set(key, place);
  }

  let inserted = 0;
  let skipped = 0;

  for (const place of seen.values()) {
    const name = place.displayName?.text;
    if (!name) continue;

    const phone = place.nationalPhoneNumber ?? null;

    // Skip duplicates by phone number
    if (phone) {
      const existing = db.prepare(`SELECT id FROM practices WHERE phone = ?`).get(phone);
      if (existing) { skipped++; continue; }
    }

    // Also skip by google_place_id to catch phone-less duplicates
    if (place.id) {
      const existing = db.prepare(`SELECT id FROM practices WHERE google_place_id = ?`).get(place.id);
      if (existing) { skipped++; continue; }
    }

    // Assign needs_review if the name doesn't contain "ortho" — likely a general
    // dental practice that may or may not offer orthodontics
    const isConfirmedOrtho = name.toLowerCase().includes("ortho");
    const status = isConfirmedOrtho ? "not_contacted" : "needs_review";

    db.prepare(`
      INSERT INTO practices (id, name, phone, address, website, email, status, google_place_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      name,
      phone,
      place.formattedAddress ?? null,
      place.websiteUri ?? null,
      null,
      status,
      place.id ?? null,
    );

    inserted++;
  }

  return NextResponse.json({
    found: seen.size,
    inserted,
    skipped,
    location: stateCode ? (STATE_NAMES[stateCode] ?? location.trim()) : location.trim(),
    searches: searchedQueries.size,
    stateMode: !!stateCode,
  });
}
