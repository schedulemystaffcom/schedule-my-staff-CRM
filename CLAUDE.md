# ScheduleMyStaff — Claude Code Context

## What This App Is
An internal sales CRM + Google Places scraper built for orthodontic and dental practice outreach. It lets users scrape Google Maps for orthodontists, dentists, or both (by city, zip, or entire state), auto-add them to Supabase, and manage the outreach pipeline with statuses, notes, and filters.

**Not a public product — internal use only.**

---

## Tech Stack
- **Framework**: Next.js 14 App Router (TypeScript)
- **Database**: Supabase (PostgreSQL) — project `fdkabfyoahsbczbepfnt` ("schedule my staff crm")
- **Hosting**: Netlify (auto-deploys from GitHub `schedulemystaffcom/schedule-my-staff-CRM`)
- **Background Jobs**: Netlify Background Functions (15-min timeout) for long-running scrapes
- **Styling**: Tailwind CSS with custom brand tokens in `tailwind.config.js` and component classes in `globals.css`
- **Fonts**: Inter (Google Fonts)
- **Scraping**: Google Places API (New) — `places.googleapis.com/v1/places:searchText`
- **Google Cloud Project**: `river-cycle-491120-q4` ("My First Project") — contains the API key with Places API (New) enabled
- **Live URL**: https://schedule-my-staff-crm.netlify.app
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
    scraper/page.tsx                # Scraper page — search form + polling UI for background jobs
    practice/[id]/page.tsx          # Practice detail page — edit, status, outreach notes
    api/
      scrape/route.ts               # POST creates a scrape job + triggers background fn; GET polls job status
      practices/route.ts            # GET/POST/DELETE /api/practices — list/filter/sort/add/bulk-delete
      practices/[id]/route.ts       # GET/PATCH/DELETE /api/practices/[id] — update status/contact, delete
      practices/[id]/notes/route.ts # GET/POST/DELETE /api/practices/[id]/notes — outreach notes
      states/route.ts               # GET /api/states — list distinct states from DB
      cities/route.ts               # GET /api/cities — list distinct cities from DB
  components/
    Nav.tsx                         # Left sidebar navigation (CRM + Scraper links)
    StatusBadge.tsx                 # Status pill badge component
  lib/
    supabase.ts                     # Supabase client (untyped — uses anon key)
    types.ts                        # TypeScript types: PracticeType, Status, Practice, OutreachNote, STATUS_LABELS, STATUS_COLORS
    stateCities.ts                  # STATE_NAMES, STATE_CITIES, resolveStateCode — used for state-mode scraping
netlify/
  functions/
    scrape-background.mts           # Netlify Background Function — runs the actual Google Places scraping (up to 15 min)
supabase/
  schema.sql                        # Full PostgreSQL schema for Supabase (practices, outreach_notes, scrape_jobs)
```

---

## Supabase Database Schema

All tables live in the `public` schema with RLS enabled (permissive policies — internal app).

### `practices` table
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Auto-generated via `gen_random_uuid()` |
| name | TEXT NOT NULL | Practice name |
| phone | TEXT | Partial unique index (deduplication key — allows multiple NULLs) |
| address | TEXT | Full formatted address from Google Places |
| website | TEXT | |
| email | TEXT | Manually added |
| status | TEXT NOT NULL | CHECK constraint — see status workflow below |
| practice_type | TEXT NOT NULL | `orthodontist` \| `dentist` \| `unknown` (default: `unknown`) |
| google_place_id | TEXT | Partial unique index (secondary dedup key) |
| google_rating | REAL | Google Places star rating (0.0–5.0) |
| google_review_count | INTEGER | Total number of Google reviews |
| created_at | TIMESTAMPTZ | Default `NOW()` |
| updated_at | TIMESTAMPTZ | Auto-updated via PostgreSQL trigger `set_updated_at()` |

### `outreach_notes` table
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Auto-generated |
| practice_id | UUID FK | References practices.id (CASCADE DELETE) |
| call_date | DATE | Date of outreach |
| notes | TEXT | Call notes |
| created_at | TIMESTAMPTZ | Default `NOW()` |

### `scrape_jobs` table
Tracks background scrape jobs for the polling pattern.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Auto-generated — returned to frontend as `jobId` |
| status | TEXT NOT NULL | `pending` → `running` → `completed` or `failed` |
| location | TEXT NOT NULL | Search location (city, zip, or state code) |
| practice_type | TEXT NOT NULL | `orthodontist` \| `dentist` \| `both` |
| search_mode | TEXT NOT NULL | `city` \| `deep` \| `state` |
| deep_scan | BOOLEAN | |
| state_mode | BOOLEAN | |
| found | INTEGER | Total unique places found |
| inserted | INTEGER | New practices added to CRM |
| skipped | INTEGER | Duplicates skipped |
| searches | INTEGER | Number of Google API calls made |
| error | TEXT | Error message if failed |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

### Indexes & Constraints
- `practices_phone_unique` — partial unique index on `phone` WHERE phone IS NOT NULL
- `practices_google_place_id_unique` — partial unique index on `google_place_id` WHERE google_place_id IS NOT NULL
- `outreach_notes_practice_idx` — composite index on `(practice_id, call_date DESC)`
- `practices.status` has a CHECK constraint for valid values
- `set_updated_at()` trigger fires BEFORE UPDATE on `practices` and `scrape_jobs`

---

## Scraper Architecture

The scraper uses a **background job pattern** to handle long-running scrapes on Netlify:

1. **Frontend** (`/scraper`) sends POST to `/api/scrape` with search parameters
2. **API route** creates a `scrape_jobs` row (status: `pending`) and fires off the Netlify Background Function
3. **Background function** (`netlify/functions/scrape-background.mts`) runs the actual Google Places scraping:
   - Updates job status to `running`
   - Searches Google Places API for each city/zip
   - Batch-deduplicates against existing DB records (2 queries for phones + place IDs)
   - Batch-inserts new practices
   - Updates job status to `completed` or `failed` with results
4. **Frontend** polls `GET /api/scrape?jobId=xxx` every 5 seconds until the job completes

This pattern is necessary because Netlify serverless functions have a ~10-26s timeout, but state-wide scrapes take 5-15 minutes. Background functions have a **15-minute timeout**.

### Review-Based Filtering
The scraper filters out small practices by Google review count. Default thresholds (editable in UI):
- **Orthodontists**: 150+ reviews minimum
- **Dentists**: 250+ reviews minimum
- **Unknown type**: uses the lower of the two thresholds

The `google_rating` and `google_review_count` fields are stored on every scraped practice. The CRM table displays these and supports sorting by review count.

### Deduplication Strategy
- **Batch prefetch**: Before inserting, fetch all existing phones and google_place_ids in 2 queries (chunked at 300 per `.in()` call)
- **Client-side filter**: Skip any scraped practice whose phone or place_id already exists
- **Batch insert**: Insert all new practices in one Supabase call (chunked at 500)
- **Fallback**: If batch insert fails (e.g. race condition on unique constraint), falls back to one-by-one insert

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

### Local Development
```bash
npm install
# .env.local should contain:
#   NEXT_PUBLIC_SUPABASE_URL=https://fdkabfyoahsbczbepfnt.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#   GOOGLE_PLACES_API_KEY=...
npm run dev
# Open http://localhost:3000
```

Note: The scraper background function only works on Netlify (not locally via `npm run dev`). For local scrape testing, use `netlify dev` which emulates background functions.

### Production
Push to `main` on GitHub → Netlify auto-deploys → live at https://schedule-my-staff-crm.netlify.app

---

## Known Gotchas

1. **CSS 404 after adding API routes**: If you add a new file under `src/app/api/` and the browser starts getting 404 on CSS/JS, fully kill and restart `npm run dev`. Next.js hot reload sometimes breaks on new route additions.

2. **Database is Supabase**: All data is stored in the remote Supabase PostgreSQL database. No local database files needed. The Supabase client uses the anon key (no typed Database generic — removed due to compatibility issues with supabase-js v2.100+).

3. **Google Places API cost**: Each text search costs ~$0.032. Deep scan = ~10–20 API calls. State scan = potentially 100–300 calls. Monitor at: https://console.cloud.google.com/apis/api/places.googleapis.com/overview?project=river-cycle-491120-q4

4. **Two Google Places APIs**: The app uses "Places API (New)" (`places.googleapis.com`), NOT the legacy "Places API" (`places-backend.googleapis.com`). Both must be enabled in the Google Cloud project for the key to work.

5. **State address filter is abbreviation-based**: Uses the 2-letter state code (e.g., "ID") to match against formatted addresses.

6. **"Both" scrape type runs two full searches**: Orthodontist search runs first, then dentist. If a practice appears in both (e.g., an ortho that also does general dentistry), the second insert is skipped by phone deduplication.

7. **Scraper only works on Netlify**: The background function (`scrape-background.mts`) runs on Netlify's infrastructure. Local `npm run dev` will create the job but the background function won't execute. Use `netlify dev` for local testing.

---

## Netlify Configuration

- **Site**: `schedule-my-staff-crm` (ID: `b7578d8a-644d-4db9-9bf3-5a4c26b555f1`)
- **Team**: `69adf14b72f962987e11033a`
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Plugin**: `@netlify/plugin-nextjs`
- **Background function**: `netlify/functions/scrape-background.mts` (auto-detected by `-background` suffix, 15-min timeout)
- **Env vars set in Netlify**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GOOGLE_PLACES_API_KEY`

---

## Git Branches
- `main` — stable, production-ready code. All features described here are on main.
- Work on a `dev` branch for new features, merge to main when stable.
- **GitHub repo**: https://github.com/schedulemystaffcom/schedule-my-staff-CRM
- **GitHub account**: `schedulemystaffcom` (NOT CalicoYouth or theorthotoolbox)
