import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { login, currentUser } from "@/lib/session";
import { Field } from "@/components/ui";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

async function signIn(formData: FormData) {
  "use server";
  const res = await login(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
  if (!res.ok) redirect(`/login?error=${encodeURIComponent(res.error)}`);
  redirect(res.user.role === "provider" ? "/provider" : "/admin");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (user) redirect(user.role === "provider" ? "/provider" : "/admin");
  const { error } = await searchParams;
  return (
    <div className="container narrow" style={{ maxWidth: 440 }}>
      <h1>Sign in</h1>
      <p className="muted">For listed providers and staff. Businesses looking for help do not need an account.</p>
      {error && <div className="alert alert-bad" role="alert">{error}</div>}
      <form action={signIn} className="card" style={{ marginTop: 16 }}>
        <Field label="Email" name="email"><input id="email" name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Password" name="password"><input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
        <button className="btn" type="submit">Sign in</button>
      </form>
    </div>
  );
}
