import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const notes = db.prepare(`
    SELECT * FROM outreach_notes WHERE practice_id = ?
    ORDER BY call_date DESC, created_at DESC
  `).all(params.id);

  return NextResponse.json(notes);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const body = await req.json();

  if (!body.call_date) {
    return NextResponse.json({ error: "call_date is required." }, { status: 400 });
  }

  const id = randomUUID();
  db.prepare(`
    INSERT INTO outreach_notes (id, practice_id, call_date, notes)
    VALUES (?, ?, ?, ?)
  `).run(id, params.id, body.call_date, body.notes ?? null);

  const note = db.prepare(`SELECT * FROM outreach_notes WHERE id = ?`).get(id);
  return NextResponse.json(note, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get("noteId");

  if (!noteId) {
    return NextResponse.json({ error: "noteId is required." }, { status: 400 });
  }

  db.prepare(`DELETE FROM outreach_notes WHERE id = ? AND practice_id = ?`).run(noteId, params.id);
  return new NextResponse(null, { status: 204 });
}
