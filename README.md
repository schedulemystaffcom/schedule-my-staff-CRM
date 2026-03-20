# ScheduleMyStaff

Internal sales CRM + practice scraper for orthodontic outreach.

---

## Tommy's Setup Checklist

Work through these steps in order. It takes about 15 minutes total.

---

### Step 1 — Set up the Supabase database

1. Log into [supabase.com](https://supabase.com) and open your project.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query**.
4. Open the file `supabase/schema.sql` from this project folder.
5. Paste the entire contents into the SQL editor.
6. Click **Run** (or press Cmd+Enter).

   You should see a "Success" message. This creates the `practices` table and
   `outreach_notes` table with all the right indexes and constraints.

7. To get your API credentials:
   - Go to **Project Settings → API** (gear icon in sidebar).
   - Copy the **Project URL** — this is your `NEXT_PUBLIC_SUPABASE_URL`.
   - Copy the **anon / public** key — this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

### Step 2 — Get a Google Places API key

This key lets the scraper search Google Maps for orthodontic practices.

**Cost:** ~$17 per 1,000 searches. A typical city search costs a few cents.

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Click the project dropdown at the top → **New Project**. Name it anything
   (e.g. "ScheduleMyStaff").
3. In the search bar at the top, search for **"Places API"** and click it.
4. Click **Enable**.
5. In the left sidebar, go to **APIs & Services → Credentials**.
6. Click **+ Create Credentials → API key**.
7. Copy the key that appears — this is your `GOOGLE_PLACES_API_KEY`.

   *(Optional but recommended: click "Restrict key" and under API restrictions,
   select "Places API (New)" to prevent misuse if the key ever leaks.)*

---

### Step 3 — Configure environment variables

**For local development:**

1. In this project folder, duplicate the file `.env.local.example` and rename
   the copy to `.env.local`.
2. Fill in the three values:

```
NEXT_PUBLIC_SUPABASE_URL=     (from Supabase Step 1)
NEXT_PUBLIC_SUPABASE_ANON_KEY=(from Supabase Step 1)
GOOGLE_PLACES_API_KEY=        (from Google Step 2)
```

**For Netlify deployment:**

1. In your Netlify dashboard, go to **Site settings → Environment variables**.
2. Add the same three variables with their values.

---

### Step 4 — Install dependencies and run locally

You need Node.js installed (v18 or later). Check with: `node -v`

```bash
# In this project folder:
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Step 5 — Deploy to Netlify

1. Push this project folder to a GitHub repository.
2. In Netlify, click **Add new site → Import an existing project**.
3. Connect your GitHub repo.
4. Build settings should auto-detect:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
5. Make sure your environment variables are set (Step 3 above).
6. Click **Deploy site**.

---

## How to use the app

### CRM Dashboard (`/`)
- See all practices in the database.
- Filter by status using the tabs at the top.
- Search by name, phone, or address.
- Sort by name, status, or date added.
- Click **Open** on any row to view the full practice detail.

### Practice Detail (`/practice/[id]`)
- Edit contact info including phone, email, address, website.
- Update the outreach status with one click.
- Log calls with a date and notes — builds a running history.
- Delete the practice if needed.

### Scraper (`/scraper`)
- Type in a city name (e.g. `Austin, TX`) or zip code (e.g. `78701`).
- Hit **Search** — pulls up to 60 practices from Google Maps.
- New practices are automatically added to the CRM.
- Duplicates are detected by phone number and skipped.
- Run multiple searches with different zip codes to cover a larger area.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                        # CRM dashboard
│   ├── scraper/page.tsx                # Scraper UI
│   ├── practice/[id]/page.tsx          # Practice detail
│   └── api/
│       ├── scrape/route.ts             # POST /api/scrape
│       ├── practices/route.ts          # GET/POST /api/practices
│       ├── practices/[id]/route.ts     # GET/PATCH/DELETE
│       └── practices/[id]/notes/       # GET/POST/DELETE notes
├── components/
│   ├── Nav.tsx
│   └── StatusBadge.tsx
└── lib/
    ├── supabase.ts
    └── types.ts

supabase/
└── schema.sql    ← Run this once in Supabase SQL Editor
```
