"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import {
  STATUS_LABELS,
  type Practice,
  type OutreachNote,
  type Status,
} from "@/lib/types";

const ALL_STATUSES: Status[] = [
  "not_contacted",
  "called",
  "left_voicemail",
  "said_not_right_now",
  "not_interested",
  "demo_scheduled",
  "bad_lead",
];

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function PracticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [practice, setPractice] = useState<Practice | null>(null);
  const [notes, setNotes] = useState<OutreachNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit contact info state
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    name: "",
    phone: "",
    address: "",
    website: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);

  // Status update
  const [statusSaving, setStatusSaving] = useState(false);

  // New note form
  const [noteDate, setNoteDate] = useState(today());
  const [noteText, setNoteText] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchPractice = useCallback(async () => {
    const res = await fetch(`/api/practices/${id}`);
    if (!res.ok) {
      router.push("/");
      return;
    }
    const data: Practice = await res.json();
    setPractice(data);
    setEditFields({
      name: data.name,
      phone: data.phone ?? "",
      address: data.address ?? "",
      website: data.website ?? "",
      email: data.email ?? "",
    });
  }, [id, router]);

  const fetchNotes = useCallback(async () => {
    const res = await fetch(`/api/practices/${id}/notes`);
    const data: OutreachNote[] = await res.json();
    setNotes(data);
  }, [id]);

  useEffect(() => {
    Promise.all([fetchPractice(), fetchNotes()]).finally(() =>
      setLoading(false)
    );
  }, [fetchPractice, fetchNotes]);

  // Update status
  const handleStatusChange = async (newStatus: Status) => {
    if (!practice || statusSaving) return;
    setStatusSaving(true);
    const res = await fetch(`/api/practices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const updated: Practice = await res.json();
    setPractice(updated);
    setStatusSaving(false);
  };

  // Save contact info edits
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/practices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editFields.name.trim(),
        phone: editFields.phone.trim() || null,
        address: editFields.address.trim() || null,
        website: editFields.website.trim() || null,
        email: editFields.email.trim() || null,
      }),
    });
    const updated: Practice = await res.json();
    setPractice(updated);
    setSaving(false);
    setEditing(false);
  };

  // Add note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || noteSubmitting) return;
    setNoteSubmitting(true);
    await fetch(`/api/practices/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call_date: noteDate, notes: noteText.trim() }),
    });
    setNoteText("");
    setNoteDate(today());
    await fetchNotes();
    setNoteSubmitting(false);
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    await fetch(`/api/practices/${id}/notes?noteId=${noteId}`, {
      method: "DELETE",
    });
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  // Delete practice
  const handleDeletePractice = async () => {
    setDeleting(true);
    await fetch(`/api/practices/${id}`, { method: "DELETE" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
          <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
      </div>
    );
  }

  if (!practice) return null;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link href="/" className="text-slate-500 hover:text-slate-700 transition-colors">
            CRM
          </Link>
          <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-900 font-medium truncate">{practice.name}</span>
        </div>

        <div className="grid gap-6">
          {/* Contact card */}
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-lg font-bold text-slate-900">{practice.name}</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Added{" "}
                  {new Date(practice.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={() => setEditing((e) => !e)}
                className="btn-secondary text-xs"
              >
                {editing ? "Cancel" : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </>
                )}
              </button>
            </div>

            {editing ? (
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Practice Name *</label>
                  <input
                    required
                    value={editFields.name}
                    onChange={(e) => setEditFields((f) => ({ ...f, name: e.target.value }))}
                    className="input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                    <input
                      value={editFields.phone}
                      onChange={(e) => setEditFields((f) => ({ ...f, phone: e.target.value }))}
                      className="input"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={editFields.email}
                      onChange={(e) => setEditFields((f) => ({ ...f, email: e.target.value }))}
                      className="input"
                      placeholder="contact@practice.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                  <input
                    value={editFields.address}
                    onChange={(e) => setEditFields((f) => ({ ...f, address: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Website</label>
                  <input
                    value={editFields.website}
                    onChange={(e) => setEditFields((f) => ({ ...f, website: e.target.value }))}
                    className="input"
                    placeholder="https://"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ContactField
                  label="Phone"
                  value={practice.phone}
                  href={practice.phone ? `tel:${practice.phone}` : undefined}
                />
                <ContactField label="Email" value={practice.email} href={practice.email ? `mailto:${practice.email}` : undefined} />
                <ContactField label="Address" value={practice.address} className="sm:col-span-2" />
                <ContactField
                  label="Website"
                  value={practice.website}
                  href={practice.website ?? undefined}
                  external
                />
              </div>
            )}
          </div>

          {/* Status card */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Outreach Status</h2>
            <div className="flex items-center gap-3 mb-4">
              <StatusBadge status={practice.status} />
              {statusSaving && (
                <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={statusSaving || practice.status === s}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    practice.status === s
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Outreach log */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              Outreach Log
              {notes.length > 0 && (
                <span className="ml-2 text-xs text-slate-400 font-normal">
                  ({notes.length} {notes.length === 1 ? "entry" : "entries"})
                </span>
              )}
            </h2>

            {/* Add note form */}
            <form onSubmit={handleAddNote} className="mb-6 bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
              <p className="text-xs font-medium text-slate-600">Log a call or interaction</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Date of call</label>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="input text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Notes</label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                  placeholder="What happened on this call? Who did you speak with? Any follow-up needed?"
                  className="input resize-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!noteText.trim() || noteSubmitting}
                className="btn-primary"
              >
                {noteSubmitting ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Entry
                  </>
                )}
              </button>
            </form>

            {/* Notes list */}
            {notes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                No outreach logged yet. Add your first entry above.
              </p>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="border border-slate-100 rounded-xl p-4 group relative hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-slate-600">
                            {new Date(note.call_date + "T12:00:00").toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-400">
                            Logged{" "}
                            {new Date(note.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {note.notes}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50"
                        title="Delete entry"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="card p-6 border-red-100">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Danger Zone</h2>
            <p className="text-xs text-slate-400 mb-3">
              Permanently delete this practice and all its outreach history.
            </p>
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="btn-danger"
              >
                Delete Practice
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeletePractice}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Yes, delete permanently"}
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
    </main>
  );
}

function ContactField({
  label,
  value,
  href,
  external,
  className = "",
}: {
  label: string;
  value: string | null;
  href?: string;
  external?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      {value ? (
        href ? (
          <a
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className="text-sm text-blue-600 hover:underline break-all"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm text-slate-800">{value}</p>
        )
      ) : (
        <p className="text-sm text-slate-300 italic">Not set</p>
      )}
    </div>
  );
}
