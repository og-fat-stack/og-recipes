"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "../../lib/db";
import { setSession } from "../../lib/auth";
import { hashPassword } from "../../lib/password";

const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Name zu kurz").max(60),
  username: z
    .string()
    .min(2, "Benutzername zu kurz")
    .max(30, "Benutzername zu lang")
    .regex(
      /^[a-z0-9._-]+$/,
      "Benutzername: nur Kleinbuchstaben, Zahlen, Punkt, - und _",
    ),
  password: z.string().min(8, "Passwort braucht mindestens 8 Zeichen").max(200),
});

export type RegisterState = { error?: string };

export async function register(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = RegisterSchema.safeParse({
    name: formData.get("name"),
    username: String(formData.get("username") ?? "")
      .trim()
      .toLowerCase(),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const existing = await db.user.findUnique({
    where: { username: parsed.data.username },
  });
  if (existing) {
    return { error: "Dieser Benutzername ist schon vergeben." };
  }

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      username: parsed.data.username,
      passwordHash: hashPassword(parsed.data.password),
    },
  });

  await setSession(user.id);
  // Direkt ins Profil: Größe, Gewicht, Alter und Geschlecht bestimmen die
  // Kalorien- und Makro-Ziele (Formeln sind für Frauen und Männer hinterlegt).
  redirect("/profile");
}
