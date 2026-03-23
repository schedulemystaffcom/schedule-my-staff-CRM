import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: notes, error } = await supabase
    .from("outreach_notes")
    .select("*")
    .eq("practice_id", params.id)
    .order("call_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(notes);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  if (!body.call_date) {
    return NextResponse.json({ error: "call_date is required." }, { status: 400 });
  }

  const { data: note, error } = await supabase
    .from("outreach_notes")
    .insert({
      practice_id: params.id,
      call_date: body.call_date,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(note, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get("noteId");

  if (!noteId) {
    return NextResponse.json({ error: "noteId is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("outreach_notes")
    .delete()
    .eq("id", noteId)
    .eq("practice_id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
