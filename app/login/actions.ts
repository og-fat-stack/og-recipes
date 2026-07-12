"use server";

import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { clearSession, setSession } from "../../lib/auth";
import { hashPassword, verifyPassword } from "../../lib/password";

function safeNext(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "/";
  if (!s.startsWith("/") || s.startsWith("//")) return "/";
  return s;
}

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  function fail(): never {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  if (!username || !password) fail();

  const user = await db.user.findUnique({ where: { username } });
  if (!user) fail();

  if (user.passwordHash === "") {
    // Konto ohne gesetztes Passwort (z. B. per Migration angelegt): das erste
    // Login-Passwort wird als persönliches Passwort gesetzt.
    if (password.length < 8) fail();
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password) },
    });
  } else if (!verifyPassword(password, user.passwordHash)) {
    fail();
  }

  await setSession(user.id);
  redirect(next);
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
