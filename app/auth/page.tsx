"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/app/providers";

export default function AuthPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useAuth();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <main className="page-shell">
        <div className="panel max-w-xl">
          <div className="skeleton h-6 w-28 rounded mb-4" />
          <div className="skeleton h-12 w-72 rounded mb-6" />
          <div className="skeleton h-20 w-full rounded" />
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel max-w-xl page-content">
        <p className="kicker">{t("appName")}</p>
        <h1 className="text-4xl font-black tracking-tight mt-2">{t("authTitle")}</h1>
        <p className="text-[var(--text-muted)] mt-3">{t("authSubtitle")}</p>
        {error ? <p className="msg-error mt-4" role="alert">{error}</p> : null}
        <button
          type="button"
          className="btn-primary mt-6"
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            setError("");
            try {
              await signInWithGoogle();
            } catch {
              setError("ההתחברות נכשלה. נסה שוב.");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? "מתחבר..." : t("signInGoogle")}
        </button>
      </section>
    </main>
  );
}
