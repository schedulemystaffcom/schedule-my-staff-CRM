"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { STATUS_LABELS, type Practice, type OutreachNote, type Status, type PracticeType } from "@/lib/types";

const ALL_STATUSES: Status[] = [
  "not_contacted", "called", "call_back", "not_interested", "demo_scheduled", "bad_lead",
];

const STATUS_BTN: Record<Status, { active: string; inactive: string }> = {
  not_contacted:  { active: "bg-slate-700 border-slate-700 text-white",           inactive: "border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50" },
  called:         { active: "bg-cobalt-600 border-cobalt-600 text-white",         inactive: "border-slate-200 text-slate-600 hover:border-cobalt-200 hover:bg-cobalt-50" },
  call_back:      { active: "bg-yolk-400 border-yolk-400 text-ink",              inactive: "border-slate-200 text-slate-600 hover:border-yolk-200 hover:bg-yolk-50" },
  not_interested: { active: "bg-red-500 border-red-500 text-white",               inactive: "border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50" },
  demo_scheduled: { active: "bg-emerald-600 border-emerald-600 text-white",       inactive: "border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50" },
  bad_lead:       { active: "bg-stone-500 border-stone-500 text-white",            inactive: "border-slate-200 text-slate-600 hover:border-stone-300 hover:bg-stone-50" },
};

type SortField = "name" | "created_at" | "status" | "google_review_count";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function DashboardPage() {
  // List state
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState("all");
  const [typeFilter, setTypeFilter] = useState<PracticeType | "all">("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState("all");
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortField>("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Panel state
  const [panel, setPanel] = useState<Practice | null>(null);
  const [notes, setNotes] = useState<OutreachNote[]>([]);
  const [noteDate, setNoteDate] = useState(todayStr());
  const [noteText, setNoteText] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", phone: "", address: "", website: "", email: "" });
  const [contactSaving, setContactSaving] = useState(false);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", address: "", website: "", email: "" });
  const [addSaving, setAddSaving] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPractices = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      sort, order,
      ...(activeStatus !== "all" && { status: activeStatus }),
      ...(typeFilter !== "all" && { practiceType: typeFilter }),
      ...(stateFilter !== "all" && { state: stateFilter }),
      ...(cityFilter !== "all" && { city: cityFilter }),
      ...(debouncedSearch && { search: debouncedSearch }),
    });
    const res = await fetch(`/api/practices?${params}`);
    const data: Practice[] = await res.json();
    setPractices(data);
    setLoading(false);
  }, [activeStatus, typeFilter, stateFilter, cityFilter, debouncedSearch, sort, order]);

  const fetchCounts = useCallback(async () => {
    const res = await fetch("/api/practices");
    const all: Practice[] = await res.json();
    const c: Record<string, number> = { all: all.length };
    for (const s of ALL_STATUSES) c[s] = all.filter((p) => p.status === s).length;
    setCounts(c);
  }, []);

  const fetchStates = useCallback(async () => {
    const res = await fetch("/api/states");
    const data: string[] = await res.json();
    setAvailableStates(data);
  }, []);

  const fetchCities = useCallback(async () => {
    const params = new URLSearchParams(stateFilter !== "all" ? { state: stateFilter } : {});
    const res = await fetch(`/api/cities?${params}`);
    const data: string[] = await res.json();
    setAvailableCities(data);
  }, [stateFilter]);

  useEffect(() => { fetchPractices(); }, [fetchPractices]);
  useEffect(() => { fetchCounts(); }, [fetchCounts, practices]);
  useEffect(() => { fetchStates(); }, [fetchStates, practices]);
  useEffect(() => { fetchCities(); }, [fetchCities]);
  // Reset city filter when state changes
  useEffect(() => { setCityFilter("all"); }, [stateFilter]);
  // Clear selection when list changes due to filter/search/sort
  useEffect(() => { setSelectedIds(new Set()); setConfirmingDelete(false); }, [activeStatus, typeFilter, stateFilter, cityFilter, debouncedSearch, sort, order]);

  const openPanel = async (practice: Practice) => {
    setPanel(practice);
    setContactForm({ name: practice.name, phone: practice.phone ?? "", address: practice.address ?? "", website: practice.website ?? "", email: practice.email ?? "" });
    setEditingContact(false);
    setNoteText("");
    setNoteDate(todayStr());
    const res = await fetch(`/api/practices/${practice.id}/notes`);
    setNotes(await res.json());
  };

  const closePanel = () => { setPanel(null); setNotes([]); setEditingContact(false); };

  const handleStatusChange = async (newStatus: Status) => {
    if (!panel || statusSaving) return;
    setStatusSaving(true);
    const optimistic = { ...panel, status: newStatus };
    setPanel(optimistic);
    setPractices((prev) => prev.map((p) => p.id === panel.id ? optimistic : p));
    const res = await fetch(`/api/practices/${panel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const updated: Practice = await res.json();
    setPanel(updated);
    setPractices((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    setStatusSaving(false);
  };

  const saveContact = async () => {
    if (!panel || contactSaving) return;
    setContactSaving(true);
    const body = {
      name: contactForm.name.trim() || panel.name,
      phone: contactForm.phone.trim() || null,
      address: contactForm.address.trim() || null,
      website: contactForm.website.trim() || null,
      email: contactForm.email.trim() || null,
    };
    const res = await fetch(`/api/practices/${panel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const updated: Practice = await res.json();
    setPanel(updated);
    setPractices((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    setEditingContact(false);
    setContactSaving(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!panel || !noteText.trim() || noteSubmitting) return;
    setNoteSubmitting(true);
    const res = await fetch(`/api/practices/${panel.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call_date: noteDate, notes: noteText.trim() }),
    });
    const note: OutreachNote = await res.json();
    setNotes((prev) => [note, ...prev]);
    setNoteText("");
    setNoteDate(todayStr());
    setNoteSubmitting(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!panel) return;
    await fetch(`/api/practices/${panel.id}/notes?noteId=${noteId}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const handleAddPractice = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSaving(true);
    await fetch("/api/practices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addForm.name.trim(),
        phone: addForm.phone.trim() || null,
        address: addForm.address.trim() || null,
        website: addForm.website.trim() || null,
        email: addForm.email.trim() || null,
      }),
    });
    setAddForm({ name: "", phone: "", address: "", website: "", email: "" });
    setShowAddModal(false);
    setAddSaving(false);
    fetchPractices();
  };

  const toggleSort = (field: SortField) => {
    if (sort === field) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSort(field); setOrder("asc"); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === practices.length && practices.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(practices.map((p) => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (bulkDeleting || selectedIds.size === 0) return;
    setBulkDeleting(true);
    await fetch("/api/practices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    if (panel && selectedIds.has(panel.id)) closePanel();
    setSelectedIds(new Set());
    setConfirmingDelete(false);
    setBulkDeleting(false);
    fetchPractices();
    fetchCounts();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort !== field)
      return <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>;
    return order === "asc"
      ? <svg className="w-3 h-3 text-cobalt-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
      : <svg className="w-3 h-3 text-cobalt-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>;
  };

  return (
    <>
      {/* Main content — panel overlays on top, no shift */}
      <div>

        {/* Sticky header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Practices</h1>
              <p className="text-xs text-slate-400 mt-0.5">{counts.all ?? 0} in database</p>
            </div>
            <button onClick={() => setShowAddModal(true)} className="btn-secondary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Manually
            </button>
          </div>

          {/* Practice type toggle */}
          <div className="flex items-center gap-1.5 mb-3">
            {(["all", "orthodontist", "dentist", "unknown"] as const).map((t) => {
              const labels: Record<typeof t, string> = {
                all: "All Types",
                orthodontist: "Orthodontists",
                dentist: "Dentists",
                unknown: "Unknown",
              };
              const colors: Record<typeof t, { active: string; inactive: string }> = {
                all:          { active: "bg-cobalt-700 text-white",          inactive: "bg-slate-100 text-slate-500 hover:bg-cobalt-50 hover:text-cobalt-700" },
                orthodontist: { active: "bg-cobalt-600 text-white",          inactive: "bg-slate-100 text-slate-500 hover:bg-cobalt-50 hover:text-cobalt-600" },
                dentist:      { active: "bg-yolk-400 text-ink",              inactive: "bg-slate-100 text-slate-500 hover:bg-yolk-50 hover:text-yolk-600" },
                unknown:      { active: "bg-yellow-400 text-yellow-900",     inactive: "bg-slate-100 text-slate-500 hover:bg-yellow-50 hover:text-yellow-700" },
              };
              const active = typeFilter === t;
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${active ? colors[t].active : colors[t].inactive}`}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-px">
            <button
              onClick={() => setActiveStatus("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeStatus === "all"
                  ? "bg-cobalt-700 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-cobalt-50 hover:text-cobalt-700"
              }`}
            >
              All
              <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${activeStatus === "all" ? "bg-white/20" : "bg-white text-slate-400"}`}>
                {counts.all ?? 0}
              </span>
            </button>
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setActiveStatus(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeStatus === s
                    ? "bg-cobalt-700 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-cobalt-50 hover:text-cobalt-700"
                }`}
              >
                {STATUS_LABELS[s]}
                <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${activeStatus === s ? "bg-white/20" : "bg-white text-slate-400"}`}>
                  {counts[s] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table area */}
        <div className="px-6 py-5">
          {/* Search + Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, phone, or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9"
              />
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={`${sort}:${order}`}
                onChange={(e) => {
                  const [f, o] = e.target.value.split(":") as [SortField, "asc" | "desc"];
                  setSort(f);
                  setOrder(o);
                }}
                className={`input pr-8 appearance-none cursor-pointer font-medium min-w-[120px] ${sort !== "created_at" || order !== "desc" ? "border-cobalt-500 bg-cobalt-50 text-cobalt-700" : "text-slate-600"}`}
              >
                <option value="created_at:desc">Newest</option>
                <option value="created_at:asc">Oldest</option>
                <option value="name:asc">A → Z</option>
                <option value="name:desc">Z → A</option>
                <option value="status:asc">Status</option>
                <option value="google_review_count:desc">Most Reviews</option>
                <option value="google_review_count:asc">Fewest Reviews</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {availableStates.length > 0 && (
              <div className="relative">
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className={`input pr-8 appearance-none cursor-pointer font-medium min-w-[110px] ${stateFilter !== "all" ? "border-cobalt-500 bg-cobalt-50 text-cobalt-700" : "text-slate-600"}`}
                >
                  <option value="all">All States</option>
                  {availableStates.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}
            {availableCities.length > 0 && (
              <div className="relative">
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className={`input pr-8 appearance-none cursor-pointer font-medium min-w-[130px] ${cityFilter !== "all" ? "border-cobalt-500 bg-cobalt-50 text-cobalt-700" : "text-slate-600"}`}
                >
                  <option value="all">All Cities</option>
                  {availableCities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-cobalt-50/60">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={practices.length > 0 && selectedIds.size === practices.length}
                        ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < practices.length; }}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-cobalt-600 cursor-pointer"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      <button onClick={() => toggleSort("name")} className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">
                        Practice <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Phone</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Address</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Website</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      <button onClick={() => toggleSort("status")} className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">
                        Status <SortIcon field="status" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">
                      <button onClick={() => toggleSort("google_review_count")} className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">
                        Reviews <SortIcon field="google_review_count" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden xl:table-cell">
                      State / Zip
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden xl:table-cell">
                      <button onClick={() => toggleSort("created_at")} className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">
                        Added <SortIcon field="created_at" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <svg className="animate-spin w-5 h-5 text-cobalt-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-sm text-slate-400">Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : practices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-1">
                            <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <p className="text-sm font-semibold text-slate-600">No practices found</p>
                          <p className="text-xs text-slate-400">Use the Scraper or add one manually.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    practices.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => openPanel(p)}
                        className={`cursor-pointer transition-colors ${
                          selectedIds.has(p.id)
                            ? "bg-cobalt-50"
                            : panel?.id === p.id
                            ? "bg-cobalt-50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-4 py-3.5 w-10" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="rounded border-slate-300 text-cobalt-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`font-semibold ${panel?.id === p.id ? "text-cobalt-700" : "text-ink"}`}>
                            {p.name}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell whitespace-nowrap">
                          {p.phone ? (
                            <a href={`tel:${p.phone}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs text-slate-600 hover:text-cobalt-600 transition-colors">
                              {p.phone}
                            </a>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell max-w-[220px] truncate text-xs text-slate-500">
                          {p.address ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          {p.website ? (
                            <a href={p.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-cobalt-600 hover:underline truncate max-w-[160px] block">
                              {p.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                            </a>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell whitespace-nowrap">
                          {p.google_review_count != null ? (
                            <span className="text-xs text-slate-600">
                              <span className="text-amber-500">★</span> {p.google_rating?.toFixed(1) ?? "–"}{" "}
                              <span className="text-slate-400">({p.google_review_count.toLocaleString()})</span>
                            </span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 hidden xl:table-cell whitespace-nowrap">
                          {p.address ? (() => {
                            // Extract "STATE ZIP" from "…, STATE ZIP, USA"
                            const m = p.address.match(/,\s*([A-Z]{2}\s+\d{5}(?:-\d{4})?)/);
                            return m ? m[1] : <span className="text-slate-300">—</span>;
                          })() : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-400 hidden xl:table-cell whitespace-nowrap">
                          {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!loading && practices.length > 0 && (
            <p className="text-xs text-slate-400 mt-3 text-right">
              {practices.length} practice{practices.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* ─── Slide-out Practice Panel ─────────────────────────────────── */}
      <div className={`fixed right-0 top-0 h-full w-[460px] bg-white border-l border-slate-200 shadow-2xl z-30 flex flex-col transform transition-transform duration-300 ease-in-out ${panel ? "translate-x-0" : "translate-x-full"}`}>
        {panel && (
          <>
            {/* Panel header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <div className="min-w-0 flex-1 pr-4">
                <h2 className="text-lg font-bold text-slate-900 leading-snug">{panel.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    panel.practice_type === "orthodontist" ? "bg-cobalt-100 text-cobalt-700" :
                    panel.practice_type === "dentist"      ? "bg-yolk-50 text-yolk-600" :
                                                             "bg-yellow-100 text-yellow-700"
                  }`}>
                    {panel.practice_type === "orthodontist" ? "Orthodontist" :
                     panel.practice_type === "dentist"      ? "Dentist" : "Unknown type"}
                  </span>
                  <p className="text-xs text-slate-400">
                    Added {new Date(panel.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link href={`/practice/${panel.id}`} className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium">
                  Full view
                </Link>
                <button onClick={closePanel} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Status ── */}
              <div className="px-6 py-4 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      disabled={statusSaving}
                      className={`px-3 py-2.5 rounded-xl border-2 text-xs font-semibold text-center transition-all ${
                        panel.status === s ? STATUS_BTN[s].active : STATUS_BTN[s].inactive
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Contact ── */}
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</p>
                  {!editingContact && (
                    <button onClick={() => setEditingContact(true)} className="text-xs text-slate-400 hover:text-cobalt-600 transition-colors font-medium">
                      Edit
                    </button>
                  )}
                </div>

                {editingContact ? (
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Name</label>
                      <input value={contactForm.name} onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))} className="input text-sm" placeholder="Practice name" />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Phone</label>
                        <input value={contactForm.phone} onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))} className="input text-sm" placeholder="(555) 123-4567" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                        <input type="email" value={contactForm.email} onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))} className="input text-sm" placeholder="info@practice.com" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Address</label>
                      <input value={contactForm.address} onChange={(e) => setContactForm((f) => ({ ...f, address: e.target.value }))} className="input text-sm" placeholder="123 Main St" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Website</label>
                      <input value={contactForm.website} onChange={(e) => setContactForm((f) => ({ ...f, website: e.target.value }))} className="input text-sm" placeholder="https://" />
                    </div>
                    <div className="flex gap-2 pt-0.5">
                      <button onClick={saveContact} disabled={contactSaving} className="btn-primary flex-1 justify-center">
                        {contactSaving ? "Saving…" : "Save Changes"}
                      </button>
                      <button onClick={() => setEditingContact(false)} className="btn-secondary">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Phone */}
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      {panel.phone ? (
                        <a href={`tel:${panel.phone}`} className="text-sm font-semibold text-ink hover:text-cobalt-600 font-mono tracking-wide transition-colors">
                          {panel.phone}
                        </a>
                      ) : <span className="text-sm text-slate-400 italic">No phone on file</span>}
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      {panel.email ? (
                        <a href={`mailto:${panel.email}`} className="text-sm text-slate-800 hover:text-cobalt-600 transition-colors">{panel.email}</a>
                      ) : <span className="text-sm text-slate-400 italic">No email on file</span>}
                    </div>

                    {/* Address */}
                    {panel.address && (
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{panel.address}</p>
                      </div>
                    )}

                    {/* Website */}
                    {panel.website && (
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                        </div>
                        <a href={panel.website} target="_blank" rel="noopener noreferrer" className="text-sm text-cobalt-600 hover:underline truncate">
                          {panel.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Log a Call ── */}
              <div className="px-6 py-4 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Log a Call</p>
                <form onSubmit={handleAddNote} className="space-y-2.5">
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="input text-sm"
                    required
                  />
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={3}
                    placeholder="What happened? Who did you speak with?"
                    className="input resize-none text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!noteText.trim() || noteSubmitting}
                    className="btn-primary w-full justify-center"
                  >
                    {noteSubmitting ? "Saving…" : "Save Entry"}
                  </button>
                </form>
              </div>

              {/* ── History ── */}
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  History {notes.length > 0 && <span className="normal-case font-normal text-slate-400">({notes.length})</span>}
                </p>
                {notes.length === 0 ? (
                  <p className="text-sm text-slate-400 italic text-center py-6">No calls logged yet</p>
                ) : (
                  <div className="space-y-2.5">
                    {notes.map((note) => (
                      <div key={note.id} className="group bg-slate-50 rounded-xl p-3.5 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-slate-700">
                            {new Date(note.call_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                            {note.created_at && (
                              <span className="font-normal text-slate-400 ml-1.5">
                                · {new Date(note.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                              </span>
                            )}
                          </span>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-300 hover:text-red-500 rounded-lg"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{note.notes}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── Bulk Select Bar ──────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-cobalt-700 text-white rounded-2xl shadow-2xl px-5 py-3 border border-cobalt-600">
          <span className="text-sm font-semibold">{selectedIds.size} selected</span>
          <span className="text-slate-600">·</span>
          <button
            onClick={() => { setSelectedIds(new Set()); setConfirmingDelete(false); }}
            className="text-xs text-cobalt-200 hover:text-white transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => setConfirmingDelete(true)}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete {selectedIds.size}
          </button>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ────────────────────────────────── */}
      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmingDelete(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-slate-900">Delete {selectedIds.size} practice{selectedIds.size !== 1 ? "s" : ""}?</p>
                <p className="text-sm text-slate-500 mt-0.5">This can't be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                {bulkDeleting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Deleting…
                  </>
                ) : "Yes, delete"}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 btn-secondary justify-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add Practice Modal ────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-900">Add Practice</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddPractice} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Practice Name *</label>
                <input required autoFocus value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} className="input" placeholder="Smile Orthodontics" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label>
                  <input value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} className="input" placeholder="(555) 123-4567" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                  <input type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} className="input" placeholder="info@practice.com" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Address</label>
                <input value={addForm.address} onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))} className="input" placeholder="123 Main St, Austin, TX" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Website</label>
                <input value={addForm.website} onChange={(e) => setAddForm((f) => ({ ...f, website: e.target.value }))} className="input" placeholder="https://" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={addSaving} className="btn-primary flex-1 justify-center">
                  {addSaving ? "Saving…" : "Add Practice"}
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
