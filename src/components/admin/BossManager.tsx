"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import GlassButton from "@/components/ui/GlassButton";

type Boss = {
  id: string;
  stage: number;
  name_th: string;
  hp: number;
  icon: string;
  icon_url: string | null;
};

export default function BossManager() {
  const [supabase] = useState(() => createClient());
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const { data } = await supabase.from("bosses").select("*").order("stage");
    setBosses((data ?? []) as Boss[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadImage(boss: Boss, file: File) {
    if (!file.type.startsWith("image/")) {
      setMessage("ต้องเป็นไฟล์รูปภาพเท่านั้น");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setMessage("ไฟล์ใหญ่เกิน 3MB");
      return;
    }

    setBusyId(boss.id);
    setMessage("");

    const ext = file.name.split(".").pop();
    const path = `stage-${boss.stage}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("boss-images")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setBusyId(null);
      setMessage("อัปโหลดไม่สำเร็จ: " + uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("boss-images").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("bosses")
      .update({ icon_url: publicUrl })
      .eq("id", boss.id);

    setBusyId(null);

    if (updateError) {
      setMessage("บันทึกไม่สำเร็จ: " + updateError.message);
      return;
    }

    setBosses((prev) => prev.map((b) => (b.id === boss.id ? { ...b, icon_url: publicUrl } : b)));
    setMessage(`อัปเดตรูปด่าน ${boss.stage} แล้ว`);
  }

  async function removeImage(boss: Boss) {
    setBusyId(boss.id);
    const { error } = await supabase.from("bosses").update({ icon_url: null }).eq("id", boss.id);
    setBusyId(null);
    if (!error) {
      setBosses((prev) => prev.map((b) => (b.id === boss.id ? { ...b, icon_url: null } : b)));
    }
  }

  async function updateField(boss: Boss, field: "hp" | "name_th", value: string) {
    const patch = field === "hp" ? { hp: Number(value) || 0 } : { name_th: value };
    await supabase.from("bosses").update(patch).eq("id", boss.id);
  }

  return (
    <div className="glass rounded-[20px] p-5">
      <h2 className="font-display font-semibold text-ink">จัดการบอส</h2>
      <p className="mt-1 text-xs text-ink/50">อัปโหลดรูปมอนสเตอร์เองแทนอิโมจิได้ (สูงสุด 3MB ต่อรูป)</p>

      <ul className="mt-4 divide-y divide-black/5">
        {bosses.map((boss) => (
          <li key={boss.id} className="flex items-center gap-4 py-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black/5 text-3xl">
              {boss.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={boss.icon_url} alt={boss.name_th} className="h-full w-full object-cover" />
              ) : (
                boss.icon
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink/40">ด่าน {boss.stage}</span>
                <input
                  defaultValue={boss.name_th}
                  onBlur={(e) => updateField(boss, "name_th", e.target.value)}
                  className="rounded-lg border border-black/10 px-2 py-1 text-sm"
                />
                <input
                  type="number"
                  defaultValue={boss.hp}
                  onBlur={(e) => updateField(boss, "hp", e.target.value)}
                  className="w-20 rounded-lg border border-black/10 px-2 py-1 text-sm"
                  title="HP"
                />
              </div>

              <div className="mt-2 flex items-center gap-2">
                <label className="cursor-pointer rounded-full bg-primary-tint px-3 py-1 text-xs font-medium text-primary-deep hover:bg-primary/20">
                  {busyId === boss.id ? "กำลังอัปโหลด..." : "📤 อัปโหลดรูป"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={busyId === boss.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage(boss, file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {boss.icon_url && (
                  <GlassButton size="sm" variant="ghost" onClick={() => removeImage(boss)} disabled={busyId === boss.id}>
                    ใช้อิโมจิแทน
                  </GlassButton>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {message && <p className="mt-2 text-xs text-primary-deep">{message}</p>}
    </div>
  );
}
