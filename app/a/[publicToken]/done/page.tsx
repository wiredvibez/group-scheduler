import Link from "next/link";
import { t } from "@/lib/i18n";

export default function DonePage() {
  return (
    <main className="page-shell">
      <section className="panel max-w-2xl text-center">
        <p className="kicker">{t("he", "appName")}</p>
        <h1 className="text-4xl font-black">{t("he", "doneTitle")}</h1>
        <p className="mt-4 text-lg text-[var(--text)]">{t("he", "doneBody")}</p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">אפשר לסגור את החלון.</p>
        <Link href="/" className="btn-secondary mx-auto mt-6 inline-flex">
          חזרה לאתר
        </Link>
      </section>
    </main>
  );
}
