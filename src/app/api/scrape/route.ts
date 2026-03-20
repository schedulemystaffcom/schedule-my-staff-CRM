import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { resolveStateCode, STATE_NAMES, STATE_CITIES } from "@/lib/stateCities";
import type { PracticeType } from "@/lib/types";

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

function determinePracticeType(name: string): PracticeType {
  const n = name.toLowerCase();
  if (n.includes("ortho")) return "orthodontist";
  if (n.includes("dent") || n.includes(" dds") || n.includes(" dmd")) return "dentist";
  return "unknown";
}

// Keywords that clearly indicate non-orthodontic practices (used in ortho-only mode)
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

export async function POST(req: NextRequest) {
  const { location, deepScan, stateMode, practiceType = "orthodontist" } = await req.json();

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

  const runOrtho = practiceType === "orthodontist" || practiceType === "both";
  const runDental = practiceType === "dentist" || practiceType === "both";

  const orthoQuery = (loc: string) => `orthodontist orthodontic braces Invisalign ${loc}`;
  const dentalQuery = (loc: string) => `dentist dental family dentist ${loc}`;

  const db = getDb();
  const searchedQueries = new Set<string>();
  const allPlaces: PlacesResult[] = [];

  const runSearch = async (query: string) => {
    if (searchedQueries.has(query)) return;
    searchedQueries.add(query);
    const results = await fetchAllPages(query, apiKey);
    allPlaces.push(...results);
  };

  const expandByZip = async (onlyStateCode?: string) => {
    const zips = new Set<string>();
    for (const place of allPlaces) {
      const addr = place.formattedAddress ?? "";
      if (onlyStateCode) {
        const stateInAddr = addr.match(/,\s*([A-Z]{2})\s+\d{5}/)?.[1];
        if (stateInAddr && stateInAddr !== onlyStateCode) continue;
      }
      const m = addr.match(/\b(\d{5})\b/);
      if (m) zips.add(m[1]);
    }
    for (const zip of zips) {
      if (runOrtho) await runSearch(`orthodontist in ${zip}`);
      if (runDental) await runSearch(`dentist in ${zip}`);
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  // ── State-wide mode ──────────────────────────────────────────────────────
  const stateCode = stateMode ? resolveStateCode(location.trim()) : null;

  if (stateCode) {
    const stateName = STATE_NAMES[stateCode];
    const cities = STATE_CITIES[stateCode] ?? [];

    for (const city of cities) {
      if (runOrtho) await runSearch(orthoQuery(`${city}, ${stateName}`));
      if (runDental) await runSearch(dentalQuery(`${city}, ${stateName}`));
      await new Promise((r) => setTimeout(r, 300));
    }

    await expandByZip(stateCode);

  } else {
    // ── City / Zip mode ───────────────────────────────────────────────────
    if (runOrtho) await runSearch(orthoQuery(location.trim()));
    if (runDental) await runSearch(dentalQuery(location.trim()));

    if (deepScan) {
      await expandByZip();
    }
  }

  // State filter: drop results from clearly different states
  const stateFiltered = stateCode
    ? allPlaces.filter((place) => {
        const addr = place.formattedAddress ?? "";
        const stateInAddr = addr.match(/,\s*([A-Z]{2})\s+\d{5}/)?.[1];
        return !stateInAddr || stateInAddr === stateCode;
      })
    : allPlaces;

  // In orthodontist-only mode, filter out obvious non-ortho practices
  const filtered = (practiceType === "orthodontist")
    ? stateFiltered.filter((place) => {
        const name = (place.displayName?.text ?? "").toLowerCase();
        if (name.includes("ortho")) return true;
        if (NON_ORTHO_KEYWORDS.some((kw) => name.includes(kw))) return false;
        return true;
      })
    : stateFiltered;

  // Deduplicate by google_place_id
  const seen = new Map<string, PlacesResult>();
  for (const place of filtered) {
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

    const type = determinePracticeType(name);
    const status = type === "unknown" ? "needs_review" : "not_contacted";

    db.prepare(`
      INSERT INTO practices (id, name, phone, address, website, email, status, practice_type, google_place_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      name,
      phone,
      place.formattedAddress ?? null,
      place.websiteUri ?? null,
      null,
      status,
      type,
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
