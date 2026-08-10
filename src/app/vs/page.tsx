import GlassButton from "@/components/ui/GlassButton";

export default function VsPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-6 py-10">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-plum/20 blur-3xl" />
      </div>

      <h1 className="font-display text-3xl font-bold text-plum-deep">
        ท้าแข่งวิดพื้น
      </h1>
      <p className="max-w-md text-center text-ink/60">
        เลือกคู่แข่ง แล้วทั้งคู่วิดพื้นในเวลาที่กำหนด ใครทำได้มากกว่าและถูกท่าชนะ
      </p>

      <div className="glass grid w-full max-w-md gap-4 rounded-[24px] p-6 text-center">
        <p className="font-display font-semibold text-plum-deep">
          ยังไม่มีคู่แข่งที่กำลังแข่ง
        </p>
        <GlassButton variant="plum">หาคู่แข่งแบบสุ่ม</GlassButton>
        <GlassButton variant="ghost">ท้าเพื่อนด้วยลิงก์</GlassButton>
      </div>
    </main>
  );
}
