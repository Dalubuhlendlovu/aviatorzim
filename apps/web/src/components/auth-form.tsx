"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_URL } from "../lib/api";
import { saveStoredSession } from "../lib/auth";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [result, setResult] = useState<string>("Use the seeded demo account or connect the backend route to Prisma.");

  async function handleSubmit(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch(`${API_URL}/api/auth/${mode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      setResult(data.error ?? "Request failed");
      return;
    }

    saveStoredSession({
      token: data.token,
      user: data.user
    });

    setResult(`Authenticated ${data.user.fullName}`);
    router.push(data.user.isAdmin ? "/admin" : "/dashboard");
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="card max-w-xl space-y-4 p-6">
      {mode === "signup" && (
        <>
          <input name="fullName" placeholder="Full name" className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3" required />
          <input name="address" placeholder="Address" className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3" required />
          <input name="phoneNumber" placeholder="Phone number" className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3" required />
        </>
      )}
      <input name="email" type="email" placeholder="Email" className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3" required />
      <input name="password" type="password" placeholder="Password" className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3" required />
      <button className="w-full rounded-2xl bg-aviator.yellow px-4 py-3 font-bold text-black">{mode === "login" ? "Login" : "Create account"}</button>
      <p className="text-sm text-neutral-300">{result}</p>
    </form>
  );
}
