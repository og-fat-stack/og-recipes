import { redirect } from "next/navigation";
import { hasValidSession } from "../../lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (await hasValidSession()) redirect("/");
  const sp = await searchParams;

  return <LoginForm next={sp.next ?? "/"} error={sp.error === "1"} />;
}
