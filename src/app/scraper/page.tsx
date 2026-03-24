"use client";

import { useState } from "react";
import Link from "next/link";
import { STATE_NAMES } from "@/lib/stateCities";

interface ScrapeResult {
  found: number;
  inserted: number;
  skipped: number;
  location: string;
  searches: number;
  stateMode?: boolean;
}

interface SearchHistoryItem {
  location: string;
  result: ScrapeResult;
  timestamp: Date;
  mode: "city" | "deep" | "state";
}

const STATE_OPTIONS = Object.entries(STATE_NAMES).sort((a, b) =>
  a[1].localeCompare(b[1])
);

export default function ScraperPage() {
  // "city" = single city/zip, "deep" = city + zip expansion, "state" = whole state
  const [mode, setMode] = useState<"city" | "deep" | "state">("deep");
  const [practiceType, setPracticeType] = useState<"orthodontist" | "dentist" | "both">("orthodontist");
  const [location, setLocation] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [minReviewsOrtho, setMinReviewsOrtho] = useState(150);
  const [minReviewsDental, setMinReviewsDental] = useState(250);

  const isStateMode = mode === "state";
  const canSubmit = isStateMode ? !!selectedState : !!location.trim();

  const pollForResult = async (jobId: string) => {
    const maxAttempts = 180; // 15 minutes at 5s intervals
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const res = await fetch(`/api/scrape?jobId=${jobId}`);
        const job = await res.json();

        if (job.status === "completed") {
          const scrapeResult: ScrapeResult = {
            found: job.found ?? 0,
            inserted: job.inserted ?? 0,
            skipped: job.skipped ?? 0,
            location: job.location ?? "",
            searches: job.searches ?? 0,
            stateMode: job.state_mode ?? false,
          };
          setResult(scrapeResult);
          setHistory((prev) => [
            {
              location: isStateMode ? (STATE_NAMES[selectedState] ?? selectedState) : location.trim(),
              result: scrapeResult,
              timestamp: new Date(),
              mode,
            },
            ...prev.slice(0, 9),
          ]);
          setLoading(false);
          return;
        }

        if (job.status === "failed") {
          setError(job.error ?? "Scrape failed. Please try again.");
          setLoading(false);
          return;
        }
        // Still pending or running — keep polling
      } catch {
        // Network hiccup — keep trying
      }
    }
    setError("Scrape timed out. Please try again.");
    setLoading(false);
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const payload = isStateMode
      ? { location: selectedState, stateMode: true, deepScan: false, practiceType, minReviewsOrtho, minReviewsDental }
      : { location: location.trim(), stateMode: false, deepScan: mode === "deep", practiceType, minReviewsOrtho, minReviewsDental };

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Start polling for the background job result
      if (data.jobId) {
        pollForResult(data.jobId);
      } else {
        setError("Failed to start scrape job.");
        setLoading(false);
      }
    } catch {
      setError("Network error — please check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-ink">Practice Scraper</h1>
        <p className="text-sm text-slate-500 mt-1">
          Search Google Maps for orthodontists, dentists, or both by city, zip
          code, or entire state. New practices are added to the CRM automatically
          — duplicates are skipped by phone number.
        </p>
      </div>

      {/* Search form */}
      <div className="card p-6 mb-6">
        <form onSubmit={handleScrape} className="flex flex-col gap-4">

          {/* Practice type selector */}
          <div>
            <p className="block text-sm font-medium text-slate-700 mb-2">Practice type</p>
            <div className="grid grid-cols-3 gap-2">
              {(["orthodontist", "dentist", "both"] as const).map((t) => {
                const labels: Record<typeof t, { title: string; sub: string }> = {
                  orthodontist: { title: "Orthodontists", sub: "Braces & aligners" },
                  dentist:      { title: "Dentists",      sub: "General dental" },
                  both:         { title: "Both",          sub: "All practice types" },
                };
                const active = practiceType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPracticeType(t)}
                    disabled={loading}
                    className={`flex flex-col items-center text-center px-3 py-2.5 rounded-xl border-2 transition-all ${
                      active
                        ? "border-cobalt-600 bg-cobalt-50 text-cobalt-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-cobalt-200"
                    }`}
                  >
                    <span className={`text-sm font-semibold ${active ? "text-cobalt-700" : "text-slate-700"}`}>
                      {labels[t].title}
                    </span>
                    <span className={`text-xs mt-0.5 ${active ? "text-cobalt-600" : "text-slate-400"}`}>
                      {labels[t].sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode selector */}
          <div>
            <p className="block text-sm font-medium text-slate-700 mb-2">Search mode</p>
            <div className="grid grid-cols-3 gap-2">
              {(["city", "deep", "state"] as const).map((m) => {
                const labels: Record<typeof m, { title: string; sub: string }> = {
                  city:  { title: "City / Zip",   sub: "Single search" },
                  deep:  { title: "Deep Scan",    sub: "City + all zips" },
                  state: { title: "Entire State", sub: "Every major city" },
                };
                const active = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    disabled={loading}
                    className={`flex flex-col items-center text-center px-3 py-2.5 rounded-xl border-2 transition-all ${
                      active
                        ? "border-cobalt-600 bg-cobalt-50 text-cobalt-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-cobalt-200"
                    }`}
                  >
                    <span className={`text-sm font-semibold ${active ? "text-cobalt-700" : "text-slate-700"}`}>
                      {labels[m].title}
                    </span>
                    <span className={`text-xs mt-0.5 ${active ? "text-cobalt-600" : "text-slate-400"}`}>
                      {labels[m].sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input row */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1.5">
              {isStateMode ? "State" : "City or Zip Code"}
            </label>
            <div className="flex gap-3">
              {isStateMode ? (
                <select
                  id="location"
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  disabled={loading}
                  className="input flex-1"
                >
                  <option value="">Select a state…</option>
                  {STATE_OPTIONS.map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              ) : (
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    id="location"
                    type="text"
                    placeholder="e.g. Austin, TX  or  78701"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={loading}
                    className="input pl-9"
                    autoFocus
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="btn-primary px-5"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Searching…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Mode description hint */}
          <p className="text-xs text-slate-400 -mt-1">
            {mode === "city"  && "Runs a single search for the city or zip code you enter."}
            {mode === "deep"  && "Searches the city first, then re-searches every zip code found — typically 10–20× more results. Takes 1–3 minutes."}
            {mode === "state" && "Searches all major metro areas in the state, then expands by every zip code discovered. May take 5–15 minutes for large states."}
          </p>

          {/* Minimum review thresholds */}
          <div>
            <p className="block text-sm font-medium text-slate-700 mb-2">Minimum Google reviews</p>
            <p className="text-xs text-slate-400 mb-2">Only practices above these thresholds will be added to the CRM.</p>
            <div className="grid grid-cols-2 gap-3">
              {(practiceType === "orthodontist" || practiceType === "both") && (
                <div>
                  <label htmlFor="minOrtho" className="text-xs text-slate-500 mb-1 block">Orthodontists</label>
                  <input
                    id="minOrtho"
                    type="number"
                    min={0}
                    value={minReviewsOrtho}
                    onChange={(e) => setMinReviewsOrtho(Number(e.target.value) || 0)}
                    disabled={loading}
                    className="input text-sm"
                  />
                </div>
              )}
              {(practiceType === "dentist" || practiceType === "both") && (
                <div>
                  <label htmlFor="minDental" className="text-xs text-slate-500 mb-1 block">Dentists</label>
                  <input
                    id="minDental"
                    type="number"
                    min={0}
                    value={minReviewsDental}
                    onChange={(e) => setMinReviewsDental(Number(e.target.value) || 0)}
                    disabled={loading}
                    className="input text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-3 text-slate-600">
            <svg className="animate-spin w-5 h-5 text-cobalt-600 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div>
              <p className="font-medium text-slate-700">
                {mode === "state"
                  ? `Scanning all of ${STATE_NAMES[selectedState] ?? selectedState}…`
                  : mode === "deep"
                  ? "Deep scanning Google Maps…"
                  : "Searching Google Maps…"}
              </p>
              <p className="text-sm text-slate-500">
                {mode === "state"
                  ? "Searching every major city then all zip codes — this can take 5–15 minutes."
                  : mode === "deep"
                  ? "Searching city then all zip codes within it — this takes 1–3 minutes."
                  : "This can take up to 15 seconds while we pull all results."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-red-700 text-sm">Scrape failed</p>
              <p className="text-red-600 text-sm mt-0.5">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success result */}
      {result && !loading && (
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-yolk-50 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-yolk-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                Search complete for &ldquo;{result.location}&rdquo;
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {result.searches} search{result.searches !== 1 ? "es" : ""} run
                {result.stateMode && " across all major cities + zip codes"}
                {!result.stateMode && result.searches > 1 && ` (1 city + ${result.searches - 1} zip codes)`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{result.found}</p>
              <p className="text-xs text-slate-500 mt-0.5">Found on Google</p>
            </div>
            <div className="bg-yolk-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yolk-600">{result.inserted}</p>
              <p className="text-xs text-yolk-600 mt-0.5">Added to CRM</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-slate-500">{result.skipped}</p>
              <p className="text-xs text-slate-400 mt-0.5">Already existed</p>
            </div>
          </div>

          {result.inserted > 0 && (
            <Link href="/" className="btn-primary w-full justify-center">
              View in CRM →
            </Link>
          )}
        </div>
      )}

      {/* Search history */}
      {history.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Search History
          </h2>
          <div className="card divide-y divide-slate-100">
            {history.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-700">{item.location}</p>
                    {item.mode === "state" && (
                      <span className="text-xs bg-purple-100 text-purple-600 font-medium px-1.5 py-0.5 rounded-full">State</span>
                    )}
                    {item.mode === "deep" && (
                      <span className="text-xs bg-cobalt-100 text-cobalt-600 font-medium px-1.5 py-0.5 rounded-full">Deep</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    {item.result.searches > 1 && ` · ${item.result.searches} searches`}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{item.result.found} found</span>
                  <span className="text-yolk-600 font-medium">+{item.result.inserted} added</span>
                  {item.result.skipped > 0 && (
                    <span className="text-slate-400">{item.result.skipped} skipped</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
