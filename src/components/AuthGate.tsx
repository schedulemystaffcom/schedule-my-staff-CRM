"use client";

import { useState, useEffect } from "react";

const CORRECT_PIN = "6767";
const AUTH_KEY = "sms_crm_authed";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = loading
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setAuthed(localStorage.getItem(AUTH_KEY) === "true");
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === CORRECT_PIN) {
      localStorage.setItem(AUTH_KEY, "true");
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  }

  // Still checking localStorage — render nothing to avoid flash
  if (authed === null) return null;

  if (authed) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-cobalt-700">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl"
      >
        {/* Logo / brand header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-cobalt-600 text-2xl font-bold text-white">
            S
          </div>
          <h1 className="text-xl font-bold text-ink">ScheduleMyStaff</h1>
          <p className="mt-1 text-sm text-cobalt-500">
            Enter your PIN to continue
          </p>
        </div>

        {/* PIN input */}
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => {
            setError(false);
            setPin(e.target.value.replace(/\D/g, ""));
          }}
          placeholder="----"
          autoFocus
          className={`w-full rounded-lg border-2 px-4 py-3 text-center text-2xl tracking-[0.5em] font-semibold text-ink outline-none transition
            ${error ? "border-signal-400 bg-signal-50" : "border-cobalt-100 bg-cobalt-50 focus:border-cobalt-600"}
          `}
        />

        {error && (
          <p className="mt-2 text-center text-sm font-medium text-signal-400">
            Incorrect PIN. Try again.
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={pin.length < 4}
          className="mt-5 w-full rounded-lg bg-cobalt-600 py-3 text-sm font-semibold text-white transition hover:bg-cobalt-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Unlock
        </button>
      </form>
    </div>
  );
}
