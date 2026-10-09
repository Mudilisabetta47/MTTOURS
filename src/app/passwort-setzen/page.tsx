import type { Metadata } from "next";
import { SetPasswordForm } from "./form";

export const metadata: Metadata = {
  title: "Passwort festlegen",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <main className="shell" style={{ maxInlineSize: 440, paddingBlock: "5rem", display: "grid", gap: "1.25rem" }}>
      <h1>Passwort festlegen</h1>
      {token ? <SetPasswordForm token={token} /> : <p className="alert alert--danger">Der Link ist unvollständig.</p>}
    </main>
  );
}
