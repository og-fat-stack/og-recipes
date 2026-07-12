import Link from "next/link";
import { redirect } from "next/navigation";
import { hasValidSession } from "../../lib/auth";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  if (await hasValidSession()) redirect("/");

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        Registrieren
      </h1>
      <p className="mb-6 text-sm text-ink-subtle">
        Eigenes Konto mit eigenem Profil, Zielen, Plänen und Tracking — für
        Frauen und Männer (Kalorien- und Makro-Formeln passen sich dem Profil
        an).
      </p>
      <RegisterForm />
      <p className="mt-6 text-sm text-ink-subtle">
        Schon ein Konto?{" "}
        <Link href="/login" className="underline">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
