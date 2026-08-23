import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BlobBackground from "@/components/BlobBackground";
import FadeIn from "@/components/animation/FadeIn";

type Notification = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/notifications");
  }

  const { data, error } = await supabase.rpc("get_my_notifications", {
    p_limit: 50,
  });

  if (error) {
    console.error("get_my_notifications error:", error);
  }

  const notifications = (data ?? []) as Notification[];

  return (
    <main className="relative flex-1 overflow-hidden px-6 py-10">
      <BlobBackground
        colors={["var(--color-primary)", "var(--color-sun)"]}
      />

      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-ink/45">
          ← หน้าแรก
        </Link>

        <FadeIn className="mt-4">
          <h1 className="font-display text-3xl font-bold text-primary-deep">
            การแจ้งเตือน
          </h1>

          <p className="mt-1 text-sm text-ink/50">
            คำขอเพื่อน, VS, Badge, Level Up และ Record ใหม่
          </p>
        </FadeIn>

        <FadeIn
          delay={0.1}
          className="glass mt-6 overflow-hidden rounded-[24px]"
        >
          {error ? (
            <div className="p-6">
              <p className="text-sm font-medium text-red-600">
                ไม่สามารถโหลดการแจ้งเตือนได้
              </p>

              <p className="mt-2 text-xs text-ink/50">
                {error.message}
              </p>
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-black/5">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 ${
                    n.read_at ? "" : "bg-primary-tint/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{n.title}</p>

                      <p className="mt-1 text-sm text-ink/55">
                        {n.body}
                      </p>
                    </div>

                    <span className="shrink-0 text-[11px] text-ink/35">
                      {new Date(n.created_at).toLocaleDateString("th-TH")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-ink/45">
              ยังไม่มีการแจ้งเตือน
            </p>
          )}
        </FadeIn>
      </div>
    </main>
  );
}