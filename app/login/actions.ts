"use server";

import { redirect } from "next/navigation";
import { checkPassword, clearSession, setSession } from "../../lib/auth";

function safeNext(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "/";
  if (!s.startsWith("/") || s.startsWith("//")) return "/";
  return s;
}

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!checkPassword(password)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }
  await setSession();
  redirect(next);
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
