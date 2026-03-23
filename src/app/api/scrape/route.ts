import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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

/**
 * Batch-fetch existing phones and google_place_ids from Supabase.
 * Chunks `.in()` queries to avoid URL length limits (~300 per batch).
 */
async function fetchExistingKeys(
  phones: string[],
  placeIds: string[]
): Promise<{ existingPhones: Set<string>; existingPlaceIds: Set<string> }> {
  const existingPhones = new Set<string>();
  const existingPlaceIds = new Set<string>();

  const CHUNK_SIZE = 300;

  // Batch-fetch existing phone numbers
  for (let i = 0; i < phones.length; i += CHUNK_SIZE) {
    const chunk = phones.slice(i, i + CHUNK_SIZE);
    const { data } = await supabase
      .from("practices")
      .select("phone")
      .in("phone", chunk);
    if (data) {
      for (const row of data) {
        if (row.phone) existingPhones.add(row.phone);
      }
    }
  }

  // Batch-fetch existing google_place_ids
  for (let i = 0; i < placeIds.length; i += CHUNK_SIZE) {
    const chunk = placeIds.slice(i, i + CHUNK_SIZE);
    const { data } = await supabase
      .from("practices")
      .select("google_place_id")
      .in("google_place_id", chunk);
    if (data) {
      for (const row of data) {
        if (row.google_place_id) existingPlaceIds.add(row.google_place_id);
      }
    }
  }

  return { existingPhones, existingPlaceIds };
}

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

  // Deduplicate by google_place_id within the scraped results
  const seen = new Map<string, PlacesResult>();
  for (const place of filtered) {
    const key = place.id ?? place.nationalPhoneNumber ?? place.displayName?.text ?? Math.random().toString();
    if (!seen.has(key)) seen.set(key, place);
  }

  // ── Batch dedup against existing DB records ────────────────────────────
  const allPhones: string[] = [];
  const allPlaceIds: string[] = [];
  for (const place of seen.values()) {
    if (place.nationalPhoneNumber) allPhones.push(place.nationalPhoneNumber);
    if (place.id) allPlaceIds.push(place.id);
  }

  const { existingPhones, existingPlaceIds } = await fetchExistingKeys(allPhones, allPlaceIds);

  // Build the list of new practices to insert
  const newPractices: {
    name: string;
    phone: string | null;
    address: string | null;
    website: string | null;
    email: string | null;
    status: string;
    practice_type: string;
    google_place_id: string | null;
  }[] = [];

  let skipped = 0;

  for (const place of seen.values()) {
    const name = place.displayName?.text;
    if (!name) continue;

    const phone = place.nationalPhoneNumber ?? null;

    // Skip duplicates by phone number
    if (phone && existingPhones.has(phone)) {
      skipped++;
      continue;
    }

    // Skip duplicates by google_place_id
    if (place.id && existingPlaceIds.has(place.id)) {
      skipped++;
      continue;
    }

    const type = determinePracticeType(name);
    const status = type === "unknown" ? "needs_review" : "not_contacted";

    newPractices.push({
      name,
      phone,
      address: place.formattedAddress ?? null,
      website: place.websiteUri ?? null,
      email: null,
      status,
      practice_type: type,
      google_place_id: place.id ?? null,
    });
  }

  // Batch insert all new practices (Supabase accepts arrays)
  let inserted = 0;
  if (newPractices.length > 0) {
    // Insert in chunks of 500 to avoid payload size limits
    const INSERT_CHUNK = 500;
    for (let i = 0; i < newPractices.length; i += INSERT_CHUNK) {
      const chunk = newPractices.slice(i, i + INSERT_CHUNK);
      const { data, error } = await supabase
        .from("practices")
        .insert(chunk)
        .select("id");

      if (error) {
        // If batch fails (e.g. unique constraint race condition),
        // fall back to one-by-one insert
        for (const practice of chunk) {
          const { error: singleErr } = await supabase
            .from("practices")
            .insert(practice);
          if (!singleErr) inserted++;
          else skipped++;
        }
      } else {
        inserted += data?.length ?? chunk.length;
      }
    }
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
