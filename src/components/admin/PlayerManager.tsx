"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import GlassButton from "@/components/ui/GlassButton";

type Profile = { id: string; display_name: string | null; role: string };
type Session = {
 id: string;
 rep_count: number;
 duration_seconds: number;
 low_quality_ratio: number | null;
 created_at: string;
};

export default function PlayerManager() {
 const [supabase] = useState(() => createClient());
 const [query, setQuery] = useState("");
 const [results, setResults] = useState<Profile[]>([]);
 const [selected, setSelected] = useState<Profile | null>(null);
 const [sessions, setSessions] = useState<Session[]>([]);
 const [edits, setEdits] = useState<Record<string, string>>({});
 const [busy, setBusy] = useState(false);
 const [message, setMessage] = useState("");

 async function search(q: string) {
 setQuery(q);
 if (q.trim().length < 2) {
 setResults([]);
 return;
 }
 const { data } = await supabase
 .from("profiles")
 .select("id, display_name, role")
 .ilike("display_name", `%${q.trim()}%`)
 .limit(10);
 setResults((data ?? []) as Profile[]);
 }

 async function selectPlayer(p: Profile) {
 setSelected(p);
 setResults([]);
 setQuery(p.display_name ?? "");
 setMessage("");
 const { data } = await supabase
 .from("pushup_sessions")
 .select("id, rep_count, duration_seconds, low_quality_ratio, created_at")
 .eq("user_id", p.id)
 .order("created_at", { ascending: false })
 .limit(15);
 setSessions((data ?? []) as Session[]);
 }

 async function saveRepCount(sessionId: string) {
 const raw = edits[sessionId];
 if (raw === undefined) return;
 const value = Number(raw);
 if (!Number.isFinite(value) || value < 0) {
 setMessage("จำนวนครั้งต้องเป็นตัวเลขไม่ติดลบ");
 return;
 }
 setBusy(true);
 const { error } = await supabase
 .from("pushup_sessions")
 .update({ rep_count: value })
 .eq("id", sessionId);
 setBusy(false);
 if (error) {
 setMessage("บันทึกไม่สำเร็จ: " + error.message);
 return;
 }
 setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, rep_count: value } : s)));
 setEdits((prev) => {
 const next = { ...prev };
 delete next[sessionId];
 return next;
 });
 setMessage("บันทึกแล้ว");
 }

 async function deleteSession(sessionId: string) {
 if (!confirm("ลบเซสชันนี้ถาวร?")) return;
 setBusy(true);
 const { error } = await supabase.from("pushup_sessions").delete().eq("id", sessionId);
 setBusy(false);
 if (error) {
 setMessage("ลบไม่สำเร็จ: " + error.message);
 return;
 }
 setSessions((prev) => prev.filter((s) => s.id !== sessionId));
 }

 return (
 <div className="glass rounded-[20px] p-5"> <h2 className="font-display font-semibold text-ink">จัดการผู้เล่น</h2> <input
 value={query}
 onChange={(e) => search(e.target.value)}
 placeholder="ค้นหาผู้เล่นจากชื่อที่แสดง..."
 className="mt-3 w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm"
 />

 {results.length > 0 && (
 <div className="mt-2 divide-y divide-black/5 rounded-xl border border-black/10 bg-white/70">
 {results.map((p) => (
 <button
 key={p.id}
 onClick={() => selectPlayer(p)}
 className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5"
 >
 {p.display_name ?? "ไม่ระบุชื่อ"}{" "}
 {p.role === "admin" && <span className="text-xs text-plum-deep">(admin)</span>}
 </button>
 ))}
 </div>
 )}

 {selected && (
 <div className="mt-4"> <p className="text-sm font-medium text-ink/70">
 เซสชันล่าสุดของ {selected.display_name ?? "ผู้เล่น"}
 </p>

 {sessions.length === 0 ? (
 <p className="mt-2 text-xs text-ink/40">ไม่มีเซสชัน</p>
 ) : (
 <ul className="mt-2 divide-y divide-black/5">
 {sessions.map((s) => (
 <li key={s.id} className="flex items-center gap-2 py-2 text-sm"> <span className="w-24 shrink-0 text-xs text-ink/40">
 {new Date(s.created_at).toLocaleDateString("th-TH")}
 </span> <input
 type="number"
 value={edits[s.id] ?? s.rep_count}
 onChange={(e) => setEdits((prev) => ({ ...prev, [s.id]: e.target.value }))}
 className="w-20 rounded-lg border border-black/10 px-2 py-1 text-sm"
 /> <span className="text-xs text-ink/40">
 ({s.duration_seconds}s
 {s.low_quality_ratio && s.low_quality_ratio > 0.3 ? " คุณภาพต่ำ" : ""})
 </span> <div className="ml-auto flex gap-1"> <GlassButton
 size="sm"
 variant="ghost"
 onClick={() => saveRepCount(s.id)}
 disabled={busy || edits[s.id] === undefined}
 >
 บันทึก
 </GlassButton> <GlassButton size="sm" variant="ghost" onClick={() => deleteSession(s.id)} disabled={busy}>
 ลบ
 </GlassButton> </div> </li>
 ))}
 </ul>
 )}
 </div>
 )}

 {message && <p className="mt-2 text-xs text-primary-deep">{message}</p>}
 </div>
 );
}
