import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const practice = db.prepare(`SELECT * FROM practices WHERE id = ?`).get(params.id);

  if (!practice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(practice);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const body = await req.json();

  const allowed = ["name", "phone", "address", "website", "email", "status"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
  const values = [...Object.values(updates), new Date().toISOString(), params.id];

  db.prepare(`UPDATE practices SET ${setClauses}, updated_at = ? WHERE id = ?`).run(...values);

  const practice = db.prepare(`SELECT * FROM practices WHERE id = ?`).get(params.id);
  return NextResponse.json(practice);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  db.prepare(`DELETE FROM practices WHERE id = ?`).run(params.id);
  return new NextResponse(null, { status: 204 });
}
