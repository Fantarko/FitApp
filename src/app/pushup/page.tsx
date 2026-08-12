import PushupCamera from "@/components/PushupCamera";

export default function PushupPage() {
  return (
    <main className="relative flex min-h-screen flex-1 flex-col items-center overflow-hidden px-4 py-10">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-float absolute -left-32 -top-20 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />

        <div className="animate-float-slow absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-sun/10 blur-3xl" />

        <div className="animate-float absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-plum/10 blur-3xl" />
      </div>

      {/* Header */}
      <div className="animate-fade-in mb-8 text-center">
        {/* Badge */}
        <div className="animate-slide-up mb-4 flex justify-center">
          <span
            className="
              inline-flex
              items-center
              gap-2
              rounded-full
              bg-primary-tint
              px-4
              py-2
              text-xs
              font-bold
              tracking-wider
              text-primary-deep
            "
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            SOLO WORKOUT
          </span>
        </div>

        <h1
          className="
            animate-slide-up
            font-display
            text-3xl
            font-bold
            text-primary-deep
            md:text-4xl
          "
          style={{ animationDelay: "100ms" }}
        >
          วิดพื้นวันนี้
        </h1>

        <p
          className="
            animate-slide-up
            mt-3
            text-sm
            text-ink/60
          "
          style={{ animationDelay: "180ms" }}
        >
          จัดท่าให้พร้อม แล้วเริ่มวิดพื้นได้เลย
        </p>
      </div>

      {/* Camera */}
      <div
        className="animate-slide-up relative w-full max-w-2xl"
        style={{ animationDelay: "280ms" }}
      >
        {/* Camera glow */}
        <div className="pointer-events-none absolute -inset-3 -z-10 rounded-[32px] bg-primary/10 blur-2xl" />

        <div className="glass rounded-[28px] p-2 transition-all duration-300 hover:shadow-xl">
          <PushupCamera />
        </div>
      </div>

      {/* Tips */}
      <div
        className="
          animate-slide-up
          mt-6
          w-full
          max-w-2xl
          rounded-[20px]
          border
          border-primary/10
          bg-primary-tint/60
          p-4
          text-center
        "
        style={{ animationDelay: "400ms" }}
      >
        <p className="font-display text-sm font-semibold text-primary-deep">
          💡 เคล็ดลับ
        </p>

        <p className="mt-1 text-xs leading-5 text-ink/60">
          วางกล้องให้เห็นร่างกายตั้งแต่หัวจรดเท้า
          และตรวจสอบให้แน่ใจว่ามีแสงเพียงพอ
        </p>
      </div>
    </main>
  );
}