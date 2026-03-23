# ScheduleMyStaff — Claude Code Context

## What This App Is
An internal sales CRM + Google Places scraper built for orthodontic and dental practice outreach. It lets users scrape Google Maps for orthodontists, dentists, or both (by city, zip, or entire state), auto-add them to Supabase, and manage the outreach pipeline with statuses, notes, and filters.

**Not a public product — internal use only.**

---

## Tech Stack
- **Framework**: Next.js 14 App Router (TypeScript)
- **Database**: Supabase (PostgreSQL) — hosted at `fdkabfyoahsbczbepfnt.supabase.co`
- **Hosting**: Netlify (auto-deploys from GitHub `schedulemystaffcom/schedule-my-staff-CRM`)
- **Styling**: Tailwind CSS with custom brand tokens in `tailwind.config.js` and component classes in `globals.css`
- **Fonts**: Inter (Google Fonts)
- **Scraping**: Google Places API (New) — `places.googleapis.com/v1/places:searchText`
- **Env vars required**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GOOGLE_PLACES_API_KEY`

---

## Brand Colors (ScheduleMyStaff palette)
Custom Tailwind tokens defined in `tailwind.config.js`:

| Token | Hex | Usage |
|---|---|---|
| `cobalt-600` | `#2A4FB5` | Primary buttons, active states, links |
| `cobalt-700` | `#172D6E` | Sidebar bg, active tabs, hover darken |
| `cobalt-50/100` | `#EEF2FB / #dce6f7` | Light tints for selected rows, filter highlights |
| `yolk-400` | `#F5C014` | Accent — sidebar active nav, dentist type, CTAs |
| `yolk-50/200` | `#FEF8E7 / #FADA7A` | Light yellow tints |
| `yolk-600` | `#C9950A` | Darker yolk for text on light backgrounds |
| `ink` | `#1A1A2E` | Deep ink for headings and primary text |

---

## Project Structure
```
src/
  app/
    page.tsx                        # CRM main page (table, filters, side panel)
    layout.tsx                      # Root layout with sidebar
    globals.css                     # Global styles + component classes (.btn-primary, .card, .input)
    api/
      scrape/route.ts               # POST /api/scrape — scrapes Google Places & inserts practices
      practices/route.ts            # GET/POST/DELETE /api/practices — list/filter/sort/add/bulk-delete
      practices/[id]/route.ts       # PATCH/DELETE /api/practices/[id] — update status/contact, delete
      practices/[id]/notes/route.ts # GET/POST/DELETE /api/practices/[id]/notes — outreach notes
      states/route.ts               # GET /api/states — list distinct states from DB
      cities/route.ts               # GET /api/cities — list distinct cities from DB
  components/
    Nav.tsx                         # Left sidebar navigation (CRM + Scraper links)
    StatusBadge.tsx                 # Status pill badge component
  lib/
    supabase.ts                     # Supabase client (typed with Database schema)
    types.ts                        # TypeScript types: PracticeType, Status, Practice, OutreachNote, STATUS_LABELS, STATUS_COLORS, Database
    stateCities.ts                  # STATE_NAMES, STATE_CITIES, resolveStateCode — used for state-mode scraping
```

---

## Database Schema

### `practices` table
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| name | TEXT | Practice name |
| phone | TEXT | Unique index (deduplication key) |
| address | TEXT | Full formatted address |
| website | TEXT | |
| email | TEXT | Manually added |
| status | TEXT | See status workflow below |
| practice_type | TEXT | `orthodontist` \| `dentist` \| `unknown` |
| google_place_id | TEXT | Google Places place ID |
| created_at | TEXT | ISO datetime |
| updated_at | TEXT | ISO datetime |

### `outreach_notes` table
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| practice_id | TEXT FK | References practices.id (CASCADE DELETE) |
| call_date | TEXT | Date of outreach |
| notes | TEXT | Call notes |
| created_at | TEXT | |

---

## Practice Type System

Each practice gets a `practice_type` at scrape time:

| Type | How assigned |
|---|---|
| `orthodontist` | Name contains "ortho", "braces", or "invisalign" (when scraping orthodontists) |
| `dentist` | Name contains "dent" or "dental" (when scraping dentists) |
| `unknown` | Name is ambiguous (e.g. "Smile Center", "Family Care") — auto-gets `needs_review` status |

---

## Status Workflow

Statuses in order (defined in `src/lib/types.ts`):

| Status | Color | How it gets set |
|---|---|---|
| `needs_review` | Yolk yellow | Auto-assigned when practice name is ambiguous — might be wrong type |
| `not_contacted` | Slate | Default for confirmed practices |
| `called` | Cobalt blue | Manual |
| `left_voicemail` | Amber | Manual |
| `said_not_right_now` | Orange | Manual |
| `not_interested` | Red | Manual |
| `demo_scheduled` | Emerald | Manual |

**Needs Review logic**: The scraper checks the practice name against known orthodontic/dental keywords. If it doesn't match, it gets `needs_review` status. In the CRM "All" view, `needs_review` rows get a subtle yolk/yellow row tint.

---

## Scraper Details (`/api/scrape/route.ts`)

**Practice types (choose one per scrape):**
- **Orthodontists** — query: `"orthodontist orthodontic braces Invisalign [location]"`
- **Dentists** — query: `"dentist dental family dentist general dentist [location]"`
- **Both** — runs both searches back to back; phone deduplication handles overlaps

**Search modes:**
- **City / Zip** (`deepScan: false`) — single Google Places text search
- **Deep Scan** (`deepScan: true`) — searches the city first, then re-searches every unique zip code found in the results (10–20× more results, 1–3 min)
- **State mode** (`stateMode: true`) — iterates through all major cities in the state (from `stateCities.ts`), then does zip expansion on each. Takes 5–15 min for large states.

**Deduplication**: By phone number. If a practice with that phone already exists in the DB, it's skipped (counted as `skipped`).

**State address filter**: When scraping in state mode, results whose address doesn't contain the target state abbreviation are dropped before insertion. This prevents Google from returning practices from geographically distant states.

**API**: Google Places New API (`places.googleapis.com/v1/places:searchText`) with field mask for `places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri`.

---

## CRM Page (`/page.tsx`)

**Features:**
- **Practice type toggle** at top: All Types | Orthodontists | Dentists | Unknown
- **Status filter tabs** below that: All | Needs Review | Not Contacted | Called | etc.
- Filter by state and city (dropdowns, populated from DB)
- Sort by: Date Added (newest/oldest), Name (A–Z / Z–A), Status
- Search by name, phone, or address
- Row click opens a fixed side panel overlay (460px wide, does NOT shift table content)
- Side panel: view practice type badge, edit status, edit contact info, add outreach notes
- Bulk select + delete (with confirmation modal)
- `needs_review` rows get yolk tint in "All" view

---

## Running the App

```bash
npm install
# Add GOOGLE_PLACES_API_KEY=... to .env.local
npm run dev
# Open http://localhost:3000
```

See `SETUP.md` for detailed first-time setup instructions.

---

## Known Gotchas

1. **CSS 404 after adding API routes**: If you add a new file under `src/app/api/` and the browser starts getting 404 on CSS/JS, fully kill and restart `npm run dev`. Next.js hot reload sometimes breaks on new route additions.

2. **Database is Supabase**: All data is stored in the remote Supabase PostgreSQL database. No local database files needed.

4. **Google Places API cost**: Each text search costs ~$0.032. Deep scan = ~10–20 API calls. State scan = potentially 100–300 calls. Monitor at: https://console.cloud.google.com/apis/api/places_backend.googleapis.com/

5. **State address filter is abbreviation-based**: Uses the 2-letter state code (e.g., "ID") to match against formatted addresses.

6. **"Both" scrape type runs two full searches**: Orthodontist search runs first, then dentist. If a practice appears in both (e.g., an ortho that also does general dentistry), the second insert is skipped by phone deduplication.

---

## Git Branches
- `main` — stable, production-ready code. All features described here are on main.
- Work on a `dev` branch for new features, merge to main when stable.
