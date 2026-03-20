# ScheduleMyStaff — Claude Code Context

## What This App Is
An internal sales CRM + Google Places scraper built for orthodontic practice outreach. It lets users scrape Google Maps for orthodontic practices (by city, zip, or entire state), auto-add them to a local database, and manage the outreach pipeline with statuses, notes, and filters.

**Not a public product — internal use only.**

---

## Tech Stack
- **Framework**: Next.js 14 App Router (TypeScript)
- **Database**: SQLite via `better-sqlite3` (local file at `data/ortho.db`)
- **Styling**: Tailwind CSS with custom component classes in `globals.css`
- **Fonts**: Inter (Google Fonts)
- **Scraping**: Google Places API (New) — `places.googleapis.com/v1/places:searchText`
- **Env var required**: `GOOGLE_PLACES_API_KEY` in `.env.local`

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
      practices/route.ts            # GET /api/practices — list/filter/sort practices
      practices/[id]/route.ts       # PATCH/DELETE /api/practices/[id] — update status, delete
      practices/[id]/notes/route.ts # GET/POST /api/practices/[id]/notes — outreach notes
      states/route.ts               # GET /api/states — list distinct states from DB
      cities/route.ts               # GET /api/cities — list distinct cities from DB
  components/
    Nav.tsx                         # Left sidebar navigation (CRM + Scraper links)
  lib/
    db.ts                           # SQLite connection + schema initialization
    types.ts                        # TypeScript types: Status, Practice, OutreachNote, STATUS_LABELS, STATUS_COLORS
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

## Status Workflow

Statuses in order (defined in `src/lib/types.ts`):

| Status | Color | How it gets set |
|---|---|---|
| `needs_review` | Yellow | Auto-assigned by scraper when practice name doesn't contain "ortho" — might be a dentist |
| `not_contacted` | Slate | Default for confirmed ortho practices (name contains "ortho") |
| `called` | Blue | Manual |
| `left_voicemail` | Amber | Manual |
| `said_not_right_now` | Orange | Manual |
| `not_interested` | Red | Manual |
| `demo_scheduled` | Emerald | Manual |

**Needs Review logic**: The scraper checks `name.toLowerCase().includes("ortho")`. If it doesn't match, the practice gets `needs_review` status so the user can manually check if it's actually an orthodontic practice. In the CRM "All" view, `needs_review` rows get a subtle yellow/amber highlight.

---

## Scraper Details (`/api/scrape/route.ts`)

**Modes:**
- **City / Zip** (`deepScan: false`) — single Google Places text search
- **Deep Scan** (`deepScan: true`) — searches the city first, then re-searches every unique zip code found in the results (10–20× more results, 1–3 min)
- **State mode** (`stateMode: true`) — iterates through all major cities in the state (from `stateCities.ts`), then does zip expansion on each. Takes 5–15 min for large states.

**Deduplication**: By phone number. If a practice with that phone already exists in the DB, it's skipped (counted as `skipped`).

**State address filter**: When scraping in state mode, results whose address doesn't contain the target state abbreviation are dropped before insertion. This prevents Google from returning practices from geographically distant states.

**Search query**: `"orthodontist orthodontic braces Invisalign [location]"` — cast wide to catch practices with ambiguous names.

**API**: Google Places New API (`places.googleapis.com/v1/places:searchText`) with field mask for `places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri`.

---

## CRM Page (`/page.tsx`)

**Features:**
- Filter by status (tab buttons at top — "All" shows all statuses)
- Filter by state and city (dropdowns, populated from DB)
- Sort by: Date Added (newest/oldest), Name (A–Z / Z–A)
- Row click opens a side panel (fixed overlay, doesn't shift content)
- Side panel: edit status, add outreach notes with date + text
- Bulk select + delete (with confirmation modal)
- `needs_review` rows get amber row tint in "All" view

**Side panel**: `position: fixed` overlay on the right side (460px wide). Does NOT shift the table — it overlays it.

---

## Running the App

```bash
npm install
# Add GOOGLE_PLACES_API_KEY=... to .env.local
npm run dev
# Open http://localhost:3000
```

See `SETUP.md` for detailed first-time setup instructions (for users who need step-by-step help).

---

## Known Gotchas

1. **CSS 404 after adding API routes**: If you add a new file under `src/app/api/` and the browser starts getting 404 on CSS/JS, fully kill and restart `npm run dev`. Next.js hot reload sometimes breaks on new route additions.

2. **better-sqlite3 native module**: Requires a native build. If `npm install` fails on a new machine, make sure Python and build tools are available (`xcode-select --install` on Mac).

3. **Database is local**: `data/ortho.db` is gitignored. Each machine has its own database. To share data between machines, copy the `.db` file manually or set up a shared database (Supabase types are stubbed in `types.ts` if you want to migrate later).

4. **Google Places API cost**: Each text search costs ~$0.032. Deep scan = ~10–20 API calls. State scan = potentially 100–300 calls. Monitor usage at: https://console.cloud.google.com/apis/api/places_backend.googleapis.com/

5. **State address filter is abbreviation-based**: Uses the 2-letter state code (e.g., "ID") to match against formatted addresses. Works reliably for US addresses.

---

## Git Branches
- `main` — stable, production-ready code. All features described here are on main.
- Work on a `dev` branch for new features, merge to main when stable.
