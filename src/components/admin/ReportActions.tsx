"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ReportActions({
  reportId,
  status,
}: {
  reportId: string;
  status: string;
}) {
  const [supabase] = useState(() => createClient());
  const [current, setCurrent] = useState(status);
  const [busy, setBusy] = useState(false);

  async function resolve(next: "upheld" | "dismissed") {
    setBusy(true);
    const { error } = await supabase.from("cheat_reports").update({ status: next }).eq("id", reportId);
    setBusy(false);
    if (!error) setCurrent(next);
  }

  if (current !== "open") {
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          current === "upheld" ? "bg-red-50 text-red-600" : "bg-primary-tint text-primary-deep"
        }`}
      >
        {current}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => resolve("upheld")}
        disabled={busy}
        className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
      >
        ยืนยันโกง
      </button>
      <button
        onClick={() => resolve("dismissed")}
        disabled={busy}
        className="rounded-full bg-primary-tint px-2 py-0.5 text-xs font-medium text-primary-deep hover:bg-primary/20 disabled:opacity-50"
      >
        ยกเลิก
      </button>
    </div>
  );
}
