import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST /api/scrape — Creates a scrape job and triggers the background function
export async function POST(req: NextRequest) {
  const { location, deepScan, stateMode, practiceType = "orthodontist",
    minReviewsOrtho = 0, minReviewsDental = 0 } = await req.json();

  if (!location || typeof location !== "string" || !location.trim()) {
    return NextResponse.json(
      { error: "A city name or zip code is required." },
      { status: 400 }
    );
  }

  // Create a job record in Supabase
  const { data: job, error: jobError } = await supabase
    .from("scrape_jobs")
    .insert({
      location: location.trim(),
      practice_type: practiceType,
      search_mode: stateMode ? "state" : deepScan ? "deep" : "city",
      deep_scan: !!deepScan,
      state_mode: !!stateMode,
      status: "pending",
    })
    .select()
    .single();

  if (jobError || !job) {
    return NextResponse.json(
      { error: "Failed to create scrape job: " + (jobError?.message ?? "unknown") },
      { status: 500 }
    );
  }

  // Trigger the Netlify background function
  const siteUrl = process.env.URL || process.env.DEPLOY_URL || `http://localhost:8888`;
  const bgUrl = `${siteUrl}/.netlify/functions/scrape-background`;

  try {
    // Fire and forget — background function returns 202 immediately
    fetch(bgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: job.id,
        location: location.trim(),
        deepScan: !!deepScan,
        stateMode: !!stateMode,
        practiceType,
        minReviewsOrtho: Number(minReviewsOrtho) || 0,
        minReviewsDental: Number(minReviewsDental) || 0,
      }),
    }).catch((err) => {
      console.error("Failed to invoke background function:", err);
    });
  } catch (err) {
    console.error("Failed to invoke background function:", err);
  }

  // Return the job ID immediately so the frontend can poll
  return NextResponse.json({ jobId: job.id, status: "pending" }, { status: 202 });
}

// GET /api/scrape?jobId=xxx — Poll for job status
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
