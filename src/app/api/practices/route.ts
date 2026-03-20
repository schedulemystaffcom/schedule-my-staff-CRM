import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") ?? "created_at";
  const order = searchParams.get("order") ?? "desc";

  const state = searchParams.get("state");
  const practiceType = searchParams.get("practiceType");

  const validSorts = ["name", "created_at", "status"];
  const safeSort = validSorts.includes(sort) ? sort : "created_at";
  const safeOrder = order === "asc" ? "ASC" : "DESC";

  let query = `SELECT * FROM practices WHERE 1=1`;
  const params: unknown[] = [];

  if (status && status !== "all") {
    query += ` AND status = ?`;
    params.push(status);
  }

  if (practiceType && practiceType !== "all") {
    query += ` AND practice_type = ?`;
    params.push(practiceType);
  }

  if (state && state !== "all") {
    query += ` AND address LIKE ?`;
    params.push(`%, ${state} %`);
  }

  const city = searchParams.get("city");
  if (city && city !== "all") {
    // Match "..., CITY, STATE..." pattern
    query += ` AND address LIKE ?`;
    params.push(`%, ${city}, %`);
  }

  if (search) {
    query += ` AND (name LIKE ? OR address LIKE ? OR phone LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ` ORDER BY ${safeSort} ${safeOrder}`;

  const practices = db.prepare(query).all(...params);
  return NextResponse.json(practices);
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) return NextResponse.json({ deleted: 0 });
  const placeholders = ids.map(() => "?").join(",");
  const result = db.prepare(`DELETE FROM practices WHERE id IN (${placeholders})`).run(...ids);
  return NextResponse.json({ deleted: (result as { changes: number }).changes });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const id = randomUUID();
  db.prepare(`
    INSERT INTO practices (id, name, phone, address, website, email, status, practice_type, google_place_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    body.name,
    body.phone ?? null,
    body.address ?? null,
    body.website ?? null,
    body.email ?? null,
    body.status ?? "not_contacted",
    body.practice_type ?? "unknown",
    body.google_place_id ?? null,
  );

  const practice = db.prepare(`SELECT * FROM practices WHERE id = ?`).get(id);
  return NextResponse.json(practice, { status: 201 });
}
