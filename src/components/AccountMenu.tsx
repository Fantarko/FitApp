"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type AccountMenuProps = {
  displayName: string;
  avatarUrl: string;
  signOutAction: () => void;
};

const MENU_LINKS = [
  { href: "/pushup", label: "วิดพื้น" },
  { href: "/vs", label: "แข่งกับเพื่อน" },
  { href: "/boss", label: "ปราบบอส" },
  { href: "/stats", label: "รายงาน" },
  { href: "/leaderboard", label: "อันดับ" },
  { href: "/friends", label: "เพื่อน" },
  { href: "/profile", label: "โปรไฟล์" },
];

export default function AccountMenu({ displayName, avatarUrl, signOutAction }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-white/50"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full border border-white/60 object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-tint text-sm font-semibold text-primary-deep">
            {displayName.charAt(0) || "?"}
          </span>
        )}
        <span className="hidden max-w-28 truncate text-sm font-medium text-ink/80 sm:block">
          {displayName}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-2xl bg-white/95 shadow-xl backdrop-blur">
          <div className="divide-y divide-black/5">
            <nav className="py-1">
              {MENU_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm text-ink/75 hover:bg-black/5"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <form action={signOutAction}>
              <button
                type="submit"
                className="block w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                ออกจากระบบ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
