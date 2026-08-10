export default function AdminPage() {
  return (
    <main className="flex-1 px-6 py-10 md:px-10">
      <h1 className="font-display text-3xl font-bold text-primary-deep">
        Admin
      </h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="glass rounded-[20px] p-5">
          <p className="font-display font-semibold">ผู้ใช้ทั้งหมด</p>
          <p className="mt-1 text-3xl font-bold text-primary-deep">—</p>
        </div>
        <div className="glass rounded-[20px] p-5">
          <p className="font-display font-semibold">แมตช์ VS วันนี้</p>
          <p className="mt-1 text-3xl font-bold text-plum-deep">—</p>
        </div>
        <div className="glass rounded-[20px] p-5">
          <p className="font-display font-semibold">รายงานถูกโกง</p>
          <p className="mt-1 text-3xl font-bold text-sun-deep">—</p>
        </div>
      </div>
      <p className="mt-8 text-sm text-ink/50">
        หน้านี้เข้าถึงได้เฉพาะบัญชีที่มี role = admin ใน ตาราง profiles
        (ตรวจสอบใน middleware ฝั่ง server)
      </p>
    </main>
  );
}
