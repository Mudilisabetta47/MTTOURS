import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { isStaff } from "@/lib/rbac";
import { safeNextPath } from "@/lib/safe-redirect";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect((isStaff(user.roles) ? "/admin" : "/") as never);

  return (
    <main id="main" className="login">
      <div className="login__card">
        <Image src="/brand/metropol-logo.png" alt="METROPOL TOURS GmbH" width={168} height={68} priority />
        <h1>Anmelden</h1>
        <p className="login__lead">Für Mitarbeitende, Fahrer und Kunden mit Konto.</p>
        <LoginForm next={next ? safeNextPath(next) : undefined} />
        <p className="login__note">
          Passwort vergessen? Bitte wenden Sie sich an die Verwaltung. Die Selbstbedienung folgt mit dem E-Mail-Versand.
        </p>
      </div>
      <style>{`
        .login{min-block-size:100svh;display:grid;place-items:center;padding:var(--gutter);background:var(--bg-subtle)}
        .login__card{inline-size:min(100%,400px);display:grid;gap:1.1rem;padding:2rem;background:var(--bg);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--shadow-panel)}
        .login h1{font-size:var(--step-3)}
        .login__lead,.login__note{color:var(--fg-muted);font-size:var(--step--1)}
        .login__form{display:grid;gap:1rem}
      `}</style>
    </main>
  );
}
