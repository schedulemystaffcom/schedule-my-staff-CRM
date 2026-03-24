export type PracticeType = "orthodontist" | "dentist" | "unknown";

export type Status =
  | "not_contacted"
  | "called"
  | "call_back"
  | "not_interested"
  | "demo_scheduled"
  | "bad_lead";

export const STATUS_LABELS: Record<Status, string> = {
  not_contacted:  "Not Contacted",
  called:         "Called",
  call_back:      "Call Back",
  not_interested: "Not Interested",
  demo_scheduled: "Demo Scheduled",
  bad_lead:       "Bad Lead",
};

export const STATUS_COLORS: Record<Status, string> = {
  not_contacted:  "bg-slate-100 text-slate-600",
  called:         "bg-cobalt-50 text-cobalt-600",
  call_back:      "bg-yolk-50 text-yolk-600 font-semibold",
  not_interested: "bg-red-100 text-red-700",
  demo_scheduled: "bg-emerald-100 text-emerald-700",
  bad_lead:       "bg-stone-200 text-stone-600 line-through",
};

export interface Practice {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  email: string | null;
  status: Status;
  practice_type: PracticeType;
  google_place_id: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachNote {
  id: string;
  practice_id: string;
  call_date: string;
  notes: string | null;
  created_at: string;
}
