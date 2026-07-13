import { redirect } from "next/navigation";
import { hasValidSession } from "../../lib/auth";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  if (await hasValidSession()) redirect("/");

  return <RegisterForm />;
}
