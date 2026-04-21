import type { Metadata } from "next";
import { AppShell } from "../src/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aviator Zim Game",
  description: "Zimbabwe-focused crash game platform with demo mode, live rounds, payments placeholders, and responsible gambling tools."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
