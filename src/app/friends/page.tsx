"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import GlassButton from "@/components/ui/GlassButton";
import FadeIn from "@/components/animation/FadeIn";
import BlobBackground from "@/components/BlobBackground";

type FriendRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  month_reps: number;
};

type PendingRequest = {
  id: string;
  requester_id: string;
  requester_name: string | null;
};

type SearchResult = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function FriendsPage() {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  async function loadAll() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [friendsRes, pendingRes] = await Promise.all([
      supabase.rpc("get_friends_monthly_reps", { p_user_id: user.id }),
      supabase
        .from("friendships")
        .select("id, requester_id, profiles!friendships_requester_id_fkey(display_name)")
        .eq("addressee_id", user.id)
        .eq("status", "pending"),
    ]);

    setFriends((friendsRes.data ?? []) as FriendRow[]);
    setPending(
      (pendingRes.data ?? []).map((r) => ({
        id: r.id as string,
        requester_id: r.requester_id as string,
        requester_name: (r as unknown as { profiles: { display_name: string | null } }).profiles
          ?.display_name,
      }))
    );
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .ilike("display_name", `%${q.trim()}%`)
      .neq("id", userId ?? "")
      .limit(10);
    setResults((data ?? []) as SearchResult[]);
    setSearching(false);
  }

  async function sendRequest(id: string) {
    const { error } = await supabase.rpc("send_friend_request", { p_addressee_id: id });
    if (!error) setSentTo((prev) => new Set(prev).add(id));
  }

  async function respond(requestId: string, status: "accepted" | "declined") {
    await supabase.from("friendships").update({ status }).eq("id", requestId);
    loadAll();
  }

  return (
    <main className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-10">
      <BlobBackground colors={["var(--color-primary)", "var(--color-plum)"]} />

      <FadeIn className="w-full max-w-md text-center">
        <h1 className="font-display text-3xl font-bold text-primary-deep">เพื่อน</h1>
        <p className="mt-2 text-sm text-ink/60">ดูสถิติเพื่อน และชวนเพื่อนใหม่มาวิดพื้นด้วยกัน</p>
      </FadeIn>

      <FadeIn delay={0.1} className="mt-6 w-full max-w-md">
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="ค้นหาเพื่อนจากชื่อที่แสดง..."
          className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
        />
        {searching && <p className="mt-2 text-xs text-ink/40">กำลังค้นหา...</p>}
        {results.length > 0 && (
          <div className="glass mt-2 divide-y divide-black/5 rounded-2xl">
            {results.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3">
                <span className="text-sm">{r.display_name ?? "ผู้เล่นไม่ระบุชื่อ"}</span>
                <GlassButton
                  size="sm"
                  variant="ghost"
                  onClick={() => sendRequest(r.id)}
                  disabled={sentTo.has(r.id)}
                >
                  {sentTo.has(r.id) ? "ส่งแล้ว ✓" : "เพิ่มเพื่อน"}
                </GlassButton>
              </div>
            ))}
          </div>
        )}
      </FadeIn>

      {pending.length > 0 && (
        <FadeIn delay={0.15} className="mt-6 w-full max-w-md">
          <h2 className="font-display text-sm font-semibold text-ink/60">คำขอเป็นเพื่อน</h2>
          <div className="glass mt-2 divide-y divide-black/5 rounded-2xl">
            {pending.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3">
                <span className="text-sm">{p.requester_name ?? "ผู้เล่นไม่ระบุชื่อ"}</span>
                <div className="flex gap-2">
                  <GlassButton size="sm" variant="primary" onClick={() => respond(p.id, "accepted")}>
                    ยอมรับ
                  </GlassButton>
                  <GlassButton size="sm" variant="ghost" onClick={() => respond(p.id, "declined")}>
                    ปฏิเสธ
                  </GlassButton>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      <FadeIn delay={0.2} className="mt-6 w-full max-w-md">
        <h2 className="font-display text-sm font-semibold text-ink/60">
          เพื่อนของฉัน ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <p className="mt-2 text-sm text-ink/50">ยังไม่มีเพื่อน ลองค้นหาแล้วเพิ่มเพื่อนดูสิ</p>
        ) : (
          <ol className="glass mt-2 divide-y divide-black/5 rounded-2xl">
            {friends.map((f, i) => (
              <li key={f.user_id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs text-ink/40">{i + 1}</span>
                  <span className="text-sm font-medium">{f.display_name ?? "ผู้เล่นไม่ระบุชื่อ"}</span>
                </div>
                <span className="font-display text-sm font-bold text-primary-deep">
                  {f.month_reps} ครั้ง
                </span>
              </li>
            ))}
          </ol>
        )}
      </FadeIn>
    </main>
  );
}
