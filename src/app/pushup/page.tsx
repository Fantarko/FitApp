import PushupCamera from "@/components/PushupCamera";

export default function PushupPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-6 py-10">
      <h1 className="font-display text-3xl font-bold text-primary-deep">
        วิดพื้นวันนี้
      </h1>
      <PushupCamera />
    </main>
  );
}
