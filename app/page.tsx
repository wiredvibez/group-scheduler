"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/app/providers";
import { Appointment } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { t } = useTranslation();
  const [items, setItems] = useState<Appointment[]>([]);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const run = async () => {
      setListLoading(true);
      const q = query(
        collection(db, "appointments"),
        where("ownerUid", "==", user.uid),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      const next: Appointment[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Appointment, "id">),
      }));
      setItems(next);
      setListLoading(false);
    };

    void run();
  }, [user]);

  if (loading || !user) {
    return (
      <main className="page-shell">
        <div className="panel w-full max-w-4xl">
          <div className="skeleton h-6 w-24 rounded mb-4" />
          <div className="skeleton h-10 w-64 rounded mb-8" />
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel w-full max-w-4xl page-content">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="kicker">{t("appName")}</p>
            <h1 className="text-3xl font-black tracking-tight">{t("dashboardTitle")}</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/appointments/new" className="btn-primary">
              {t("createAppointment")}
            </Link>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void signOut()}
              aria-label={t("signOut")}
            >
              {t("signOut")}
            </button>
          </div>
        </div>

        {listLoading ? (
          <div className="grid gap-3" aria-busy="true" aria-live="polite">
            <p className="text-sm text-[var(--text-muted)] mb-1">טוען פגישות...</p>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-[72px] w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center border border-[var(--border)] rounded-xl bg-[var(--bg-overlay)]">
            <p className="text-[var(--text-muted)] mb-6">{t("noAppointments")}</p>
            <Link href="/appointments/new" className="btn-primary">
              {t("createAppointment")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <Link
                href={`/appointments/${item.id}`}
                className="tile block"
                key={item.id}
              >
                <h2 className="text-lg font-bold tracking-tight">{item.title}</h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  {item.description || "ללא תיאור"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
