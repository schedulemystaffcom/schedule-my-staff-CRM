# ScheduleMyStaff — Setup Guide

## What you need first
- **Node.js** (v18 or newer) — download at https://nodejs.org (click "LTS")
- **A Google Places API key** — see below

---

## Step 1 — Get a Google Places API key

1. Go to https://console.cloud.google.com
2. Create a new project (or use an existing one)
3. Go to **APIs & Services → Library**
4. Search for **"Places API (New)"** and enable it
5. Go to **APIs & Services → Credentials → Create Credentials → API Key**
6. Copy the key

---

## Step 2 — Install the app

1. Unzip this folder somewhere on your computer (e.g. your Desktop)
2. Open **Terminal** (Mac: press `Cmd + Space`, type "Terminal", hit Enter)
3. Type `cd ` (with a space after), then drag the unzipped folder into the Terminal window and press Enter
4. Run:
   ```
   npm install
   ```
   This downloads all dependencies. Takes ~1 minute.

---

## Step 3 — Add your API key

1. In the project folder, create a file called `.env.local`
2. Paste this inside (replace with your actual key):
   ```
   GOOGLE_PLACES_API_KEY=AIzaSy...your_key_here
   ```

---

## Step 4 — Start the app

In Terminal (still in the project folder), run:

```
npm run dev
```

Then open your browser and go to:
```
http://localhost:3000
```

That's it! The app creates its own database automatically on first run.

---

## Stopping the app
Press `Ctrl + C` in Terminal.

## Starting again later
Open Terminal, navigate to the folder, and run `npm run dev` again.
