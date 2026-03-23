import type { Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Netlify.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Netlify.env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

// State data (subset — imported inline to keep background fn self-contained)
const STATE_NAMES: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",
  HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",
  KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",
  MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",
  NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",
  NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",
  OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
  SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
  VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
  DC:"District of Columbia",
};

const STATE_CITIES: Record<string, string[]> = {
  AL:["Birmingham","Montgomery","Huntsville","Mobile","Tuscaloosa"],
  AK:["Anchorage","Fairbanks","Juneau"],
  AZ:["Phoenix","Tucson","Mesa","Scottsdale","Chandler","Gilbert","Tempe","Peoria","Surprise","Goodyear"],
  AR:["Little Rock","Fort Smith","Fayetteville","Springdale","Jonesboro"],
  CA:["Los Angeles","San Diego","San Jose","San Francisco","Fresno","Sacramento","Long Beach","Oakland","Bakersfield","Anaheim","Santa Ana","Riverside","Irvine","Stockton","Chula Vista","Santa Clarita","Fremont","Moreno Valley","San Bernardino","Fontana"],
  CO:["Denver","Colorado Springs","Aurora","Fort Collins","Lakewood","Thornton","Arvada","Boulder"],
  CT:["Bridgeport","New Haven","Hartford","Stamford","Waterbury","Norwalk"],
  DE:["Wilmington","Dover","Newark"],
  FL:["Jacksonville","Miami","Tampa","Orlando","St. Petersburg","Hialeah","Fort Lauderdale","Tallahassee","Port St. Lucie","Cape Coral","Pembroke Pines","Hollywood","Gainesville","Coral Springs","Clearwater"],
  GA:["Atlanta","Augusta","Columbus","Savannah","Athens","Macon","Roswell","Albany"],
  HI:["Honolulu","Pearl City","Hilo","Kailua"],
  ID:["Boise","Meridian","Nampa","Idaho Falls","Pocatello","Caldwell"],
  IL:["Chicago","Aurora","Rockford","Joliet","Naperville","Springfield","Peoria","Elgin","Champaign"],
  IN:["Indianapolis","Fort Wayne","Evansville","South Bend","Carmel","Fishers"],
  IA:["Des Moines","Cedar Rapids","Davenport","Sioux City","Iowa City"],
  KS:["Wichita","Overland Park","Kansas City","Olathe","Topeka"],
  KY:["Louisville","Lexington","Bowling Green","Owensboro","Covington"],
  LA:["New Orleans","Baton Rouge","Shreveport","Lafayette","Lake Charles"],
  ME:["Portland","Lewiston","Bangor"],
  MD:["Baltimore","Frederick","Rockville","Gaithersburg","Bowie","Annapolis"],
  MA:["Boston","Worcester","Springfield","Cambridge","Lowell","New Bedford"],
  MI:["Detroit","Grand Rapids","Warren","Sterling Heights","Ann Arbor","Lansing","Flint","Kalamazoo"],
  MN:["Minneapolis","St. Paul","Rochester","Duluth","Bloomington","Brooklyn Park"],
  MS:["Jackson","Gulfport","Southaven","Hattiesburg","Biloxi"],
  MO:["Kansas City","St. Louis","Springfield","Columbia","Independence"],
  MT:["Billings","Missoula","Great Falls","Bozeman"],
  NE:["Omaha","Lincoln","Bellevue","Grand Island"],
  NV:["Las Vegas","Henderson","Reno","North Las Vegas","Sparks"],
  NH:["Manchester","Nashua","Concord"],
  NJ:["Newark","Jersey City","Paterson","Elizabeth","Edison","Woodbridge","Toms River","Cherry Hill"],
  NM:["Albuquerque","Las Cruces","Rio Rancho","Santa Fe"],
  NY:["New York","Buffalo","Rochester","Yonkers","Syracuse","Albany","New Rochelle"],
  NC:["Charlotte","Raleigh","Greensboro","Durham","Winston-Salem","Fayetteville","Cary","Wilmington","High Point","Asheville"],
  ND:["Fargo","Bismarck","Grand Forks","Minot"],
  OH:["Columbus","Cleveland","Cincinnati","Toledo","Akron","Dayton","Canton"],
  OK:["Oklahoma City","Tulsa","Norman","Broken Arrow","Edmond"],
  OR:["Portland","Salem","Eugene","Gresham","Hillsboro","Beaverton","Bend","Medford"],
  PA:["Philadelphia","Pittsburgh","Allentown","Erie","Reading","Scranton","Bethlehem","Lancaster"],
  RI:["Providence","Cranston","Warwick"],
  SC:["Charleston","Columbia","North Charleston","Mount Pleasant","Greenville"],
  SD:["Sioux Falls","Rapid City","Aberdeen"],
  TN:["Nashville","Memphis","Knoxville","Chattanooga","Clarksville","Murfreesboro"],
  TX:["Houston","San Antonio","Dallas","Austin","Fort Worth","El Paso","Arlington","Corpus Christi","Plano","Laredo","Lubbock","Garland","Irving","Frisco","McKinney","Amarillo","Grand Prairie","Brownsville","Killeen","Midland"],
  UT:["Salt Lake City","West Valley City","Provo","West Jordan","Orem","Sandy","Ogden","St. George"],
  VT:["Burlington","South Burlington","Rutland"],
  VA:["Virginia Beach","Norfolk","Chesapeake","Richmond","Newport News","Alexandria","Hampton","Roanoke","Lynchburg"],
  WA:["Seattle","Spokane","Tacoma","Vancouver","Bellevue","Kent","Everett","Renton","Federal Way","Yakima"],
  WV:["Charleston","Huntington","Morgantown","Parkersburg"],
  WI:["Milwaukee","Madison","Green Bay","Kenosha","Racine","Appleton"],
  WY:["Cheyenne","Casper","Laramie"],
  DC:["Washington"],
};

function resolveStateCode(input: string): string | null {
  const upper = input.toUpperCase().trim();
  if (STATE_NAMES[upper]) return upper;
  const entry = Object.entries(STATE_NAMES).find(
    ([, name]) => name.toLowerCase() === input.toLowerCase().trim()
  );
  return entry ? entry[0] : null;
}

async function fetchPlacesPage(query: string, apiKey: string, pageToken?: string): Promise<PlacesResponse> {
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

function determinePracticeType(name: string, types?: string[]): "orthodontist" | "dentist" | "unknown" {
  const n = name.toLowerCase();
  if (ORTHO_KEYWORDS.some((kw) => n.includes(kw))) return "orthodontist";
  if (types?.some((t) => t.toLowerCase().includes("orthodontist"))) return "orthodontist";
  if (n.includes("dent") || n.includes(" dds") || n.includes(" dmd")) return "dentist";
  return "unknown";
}

const ORTHO_KEYWORDS = [
  "ortho","orthodontic","orthodontics","orthodontist","braces","invisalign","aligner",
];

function isOrthoPlace(place: PlacesResult): boolean {
  const name = (place.displayName?.text ?? "").toLowerCase();
  // Check name for ortho keywords
  if (ORTHO_KEYWORDS.some((kw) => name.includes(kw))) return true;
  // Check Google Places types array
  if (place.types?.some((t) => t.toLowerCase().includes("orthodontist"))) return true;
  return false;
}

async function fetchExistingKeys(phones: string[], placeIds: string[]) {
  const existingPhones = new Set<string>();
  const existingPlaceIds = new Set<string>();
  const CHUNK_SIZE = 300;

  for (let i = 0; i < phones.length; i += CHUNK_SIZE) {
    const chunk = phones.slice(i, i + CHUNK_SIZE);
    const { data } = await supabase.from("practices").select("phone").in("phone", chunk);
    if (data) for (const row of data) if (row.phone) existingPhones.add(row.phone);
  }

  for (let i = 0; i < placeIds.length; i += CHUNK_SIZE) {
    const chunk = placeIds.slice(i, i + CHUNK_SIZE);
    const { data } = await supabase.from("practices").select("google_place_id").in("google_place_id", chunk);
    if (data) for (const row of data) if (row.google_place_id) existingPlaceIds.add(row.google_place_id);
  }

  return { existingPhones, existingPlaceIds };
}

export default async (req: Request, context: Context) => {
  // Background functions return 202 immediately — this code runs async
  const body = await req.json();
  const { jobId, location, deepScan, stateMode, practiceType = "orthodontist" } = body;

  if (!jobId || !location) {
    console.error("Missing jobId or location");
    return;
  }

  const apiKey = Netlify.env.get("GOOGLE_PLACES_API_KEY");
  if (!apiKey) {
    await supabase.from("scrape_jobs").update({ status: "failed", error: "GOOGLE_PLACES_API_KEY not set" }).eq("id", jobId);
    return;
  }

  // Mark job as running
  await supabase.from("scrape_jobs").update({ status: "running" }).eq("id", jobId);

  try {
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
      for (const zip of Array.from(zips)) {
        if (runOrtho) await runSearch(`orthodontist in ${zip}`);
        if (runDental) await runSearch(`dentist in ${zip}`);
        await new Promise((r) => setTimeout(r, 300));
      }
    };

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
      if (runOrtho) await runSearch(orthoQuery(location.trim()));
      if (runDental) await runSearch(dentalQuery(location.trim()));
      if (deepScan) await expandByZip();
    }

    // State filter
    const stateFiltered = stateCode
      ? allPlaces.filter((place) => {
          const addr = place.formattedAddress ?? "";
          const s = addr.match(/,\s*([A-Z]{2})\s+\d{5}/)?.[1];
          return !s || s === stateCode;
        })
      : allPlaces;

    // Ortho-only filter — must have ortho keywords in name or Google types
    const filtered = practiceType === "orthodontist"
      ? stateFiltered.filter((place) => isOrthoPlace(place))
      : stateFiltered;

    // Deduplicate within results
    const seen = new Map<string, PlacesResult>();
    for (const place of filtered) {
      const key = place.id ?? place.nationalPhoneNumber ?? place.displayName?.text ?? Math.random().toString();
      if (!seen.has(key)) seen.set(key, place);
    }

    // Batch dedup against DB
    const allPhones: string[] = [];
    const allPlaceIds: string[] = [];
    for (const place of Array.from(seen.values())) {
      if (place.nationalPhoneNumber) allPhones.push(place.nationalPhoneNumber);
      if (place.id) allPlaceIds.push(place.id);
    }
    const { existingPhones, existingPlaceIds } = await fetchExistingKeys(allPhones, allPlaceIds);

    const newPractices: any[] = [];
    let skipped = 0;

    for (const place of Array.from(seen.values())) {
      const name = place.displayName?.text;
      if (!name) continue;
      const phone = place.nationalPhoneNumber ?? null;
      if (phone && existingPhones.has(phone)) { skipped++; continue; }
      if (place.id && existingPlaceIds.has(place.id)) { skipped++; continue; }
      const type = determinePracticeType(name, place.types);
      const status = type === "unknown" ? "needs_review" : "not_contacted";
      newPractices.push({
        name, phone,
        address: place.formattedAddress ?? null,
        website: place.websiteUri ?? null,
        email: null, status,
        practice_type: type,
        google_place_id: place.id ?? null,
      });
    }

    let inserted = 0;
    if (newPractices.length > 0) {
      const INSERT_CHUNK = 500;
      for (let i = 0; i < newPractices.length; i += INSERT_CHUNK) {
        const chunk = newPractices.slice(i, i + INSERT_CHUNK);
        const { data, error } = await supabase.from("practices").insert(chunk).select("id");
        if (error) {
          for (const practice of chunk) {
            const { error: singleErr } = await supabase.from("practices").insert(practice);
            if (!singleErr) inserted++; else skipped++;
          }
        } else {
          inserted += data?.length ?? chunk.length;
        }
      }
    }

    // Update job as completed
    await supabase.from("scrape_jobs").update({
      status: "completed",
      found: seen.size,
      inserted,
      skipped,
      searches: searchedQueries.size,
    }).eq("id", jobId);

    console.log(`Scrape job ${jobId} completed: found=${seen.size}, inserted=${inserted}, skipped=${skipped}`);

  } catch (err: any) {
    console.error(`Scrape job ${jobId} failed:`, err);
    await supabase.from("scrape_jobs").update({
      status: "failed",
      error: err.message ?? "Unknown error",
    }).eq("id", jobId);
  }
};
