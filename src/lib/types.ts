export type PracticeType = "orthodontist" | "dentist" | "unknown";

export type Status =
  | "needs_review"
  | "not_contacted"
  | "called"
  | "left_voicemail"
  | "said_not_right_now"
  | "not_interested"
  | "demo_scheduled"
  | "bad_lead";

export const STATUS_LABELS: Record<Status, string> = {
  needs_review:       "Needs Review",
  not_contacted:      "Not Contacted",
  called:             "Called",
  left_voicemail:     "Left Voicemail",
  said_not_right_now: "Said Not Right Now",
  not_interested:     "Not Interested",
  demo_scheduled:     "Demo Scheduled",
  bad_lead:           "Bad Lead",
};

export const STATUS_COLORS: Record<Status, string> = {
  needs_review:       "bg-yellow-200 text-yellow-800 font-semibold",
  not_contacted:      "bg-slate-100 text-slate-600",
  called:             "bg-cobalt-50 text-cobalt-600",
  left_voicemail:     "bg-amber-100 text-amber-700",
  said_not_right_now: "bg-orange-100 text-orange-700",
  not_interested:     "bg-red-100 text-red-700",
  demo_scheduled:     "bg-emerald-100 text-emerald-700",
  bad_lead:           "bg-stone-200 text-stone-600 line-through",
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

