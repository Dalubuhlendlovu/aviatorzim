import Link from "next/link";
import type { PropsWithChildren } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/game", label: "Live Game" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/admin", label: "Admin" },
  { href: "/provably-fair", label: "Provably Fair" },
  { href: "/responsible-gambling", label: "Safer Play" },
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/terms-and-conditions", label: "Terms" },
  { href: "/login", label: "Login" }
];

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="badge">Zimbabwe-focused crash platform</p>
            <Link href="/" className="mt-2 block text-2xl font-black tracking-tight text-white">
              Aviator Zim Game
            </Link>
          </div>
          <nav className="hidden gap-5 text-sm text-neutral-300 lg:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-aviator.yellow">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
