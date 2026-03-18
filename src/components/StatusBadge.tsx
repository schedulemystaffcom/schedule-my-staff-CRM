"use client";

import { STATUS_COLORS, STATUS_LABELS, type Status } from "@/lib/types";

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
