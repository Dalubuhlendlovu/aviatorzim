import Link from "next/link";
import type { PropsWithChildren } from "react";

const navLinks = [
  { href: "/game",                 label: "🎮 Play" },
  { href: "/dashboard",            label: "Wallet" },
  { href: "/provably-fair",         label: "Provably Fair" },
  { href: "/responsible-gambling",  label: "Safer Play" },
  { href: "/terms-and-conditions",  label: "Terms" },
];

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--c-bg)" }}>
      {/* ── Top header ─────────────────────────────────────── */}
      <header style={{
        background: "#0e0f16",
        borderBottom: "1px solid var(--c-border)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}>
        <div className="mx-auto flex max-w-screen-2xl items-center gap-4 px-3 py-2 sm:px-5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "var(--c-yellow)",
              fontSize: 18,
            }}>🐕</span>
            <span style={{ fontWeight: 900, fontSize: "1.1rem", color: "#fff", letterSpacing: "-0.02em" }}>
              Sky<span style={{ color: "var(--c-yellow)" }}>Sprint</span>
            </span>
          </Link>

          {/* Live pill */}
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: 9999,
            padding: "0.18rem 0.55rem",
            fontSize: "0.68rem",
            fontWeight: 700,
            color: "#4ade80",
            letterSpacing: "0.1em",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 1.5s infinite" }} />
            LIVE
          </span>

          {/* Nav */}
          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  padding: "0.3rem 0.75rem",
                  borderRadius: 7,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "#94a3b8",
                  textDecoration: "none",
                  transition: "color 0.15s, background 0.15s",
                }}
                className="hover:text-white hover:bg-white/5"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/login"
              style={{
                padding: "0.35rem 0.9rem",
                borderRadius: 7,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#94a3b8",
                border: "1px solid var(--c-border)",
                textDecoration: "none",
              }}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              style={{
                padding: "0.35rem 0.9rem",
                borderRadius: 7,
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "#0c0d12",
                background: "var(--c-yellow)",
                textDecoration: "none",
              }}
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-screen-2xl px-2 py-3 sm:px-4">
        {children}
      </main>

      <footer style={{ borderTop: "1px solid var(--c-border)", padding: "1rem 1.5rem", fontSize: "0.72rem", color: "var(--c-muted)", textAlign: "center" }}>
        SkySprint Zimbabwe • 18+ • Gamble responsibly •{" "}
        <Link href="/responsible-gambling" style={{ color: "var(--c-yellow)", textDecoration: "none" }}>Safer Play</Link>
        {" "}•{" "}
        <Link href="/provably-fair" style={{ color: "var(--c-yellow)", textDecoration: "none" }}>Provably Fair</Link>
        {" "}•{" "}
        <Link href="/terms-and-conditions" style={{ color: "var(--c-yellow)", textDecoration: "none" }}>Terms</Link>
        {" "}•{" "}
        <Link href="/privacy-policy" style={{ color: "var(--c-yellow)", textDecoration: "none" }}>Privacy</Link>
      </footer>
    </div>
  );
}

