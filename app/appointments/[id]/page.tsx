"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/defaults";
import { Appointment, TimeOption, VoteMode, VoteResponse } from "@/lib/types";

const CHART_COLORS = [
  "#c9a227", /* accent gold */
  "#6b9e78",
  "#9c7cb8",
  "#7a9dc4",
  "#c97a5a",
  "#7eb8a8",
  "#b8a77e",
  "#8b9ec4",
];

const CONTACT_LABELS: Record<string, string> = {
  name: "שם",
  phone: "טלפון",
  email: "אימייל",
  openQuestion: "שאלה פתוחה",
  birthday: "יום הולדת",
  gender: "מין",
};

type ActivityLog = {
  id: string;
  type: string;
  responseId: string;
  timestamp?: { seconds?: number };
  contactFingerprint?: string;
  meta?: Record<string, unknown>;
};

function toDate(seconds?: number) {
  return seconds ? new Date(seconds * 1000).toLocaleString("he-IL") : "-";
}

export default function AppointmentAdminPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [options, setOptions] = useState<TimeOption[]>([]);
  const [responses, setResponses] = useState<VoteResponse[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [error, setError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [voteMode, setVoteMode] = useState<VoteMode>("limited");
  const [maxSelections, setMaxSelections] = useState(3);
  const [resultsVisibility, setResultsVisibility] = useState<
    "hidden" | "after_submit" | "live"
  >("after_submit");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || !params.id) {
      return;
    }

    const run = async () => {
      setError("");
      const appointmentRef = doc(db, "appointments", params.id);
      const appointmentSnap = await getDoc(appointmentRef);
      if (!appointmentSnap.exists()) {
        setError("פגישה לא נמצאה.");
        return;
      }
      const data = appointmentSnap.data() as Omit<Appointment, "id">;
      if (data.ownerUid !== user.uid) {
        setError("אין הרשאה לצפות בעמוד זה.");
        return;
      }

      setAppointment({ id: appointmentSnap.id, ...data });
      setVoteMode(data.voteMode);
      setMaxSelections(data.maxSelections ?? 3);
      setResultsVisibility(data.resultsVisibility);

      const [optionsSnap, responsesSnap, activitySnap] = await Promise.all([
        getDocs(collection(db, "appointments", params.id, "timeOptions")),
        getDocs(collection(db, "appointments", params.id, "responses")),
        getDocs(
          query(
            collection(db, "appointments", params.id, "activity"),
            orderBy("timestamp", "desc"),
          ),
        ),
      ]);

      setOptions(
        optionsSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<TimeOption, "id">),
        })),
      );
      setResponses(
        responsesSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<VoteResponse, "id">),
        })),
      );
      setActivity(
        activitySnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ActivityLog, "id">),
        })),
      );
    };

    void run();
  }, [user, params.id]);

  const countsByOption = useMemo(() => {
    const map: Record<string, number> = {};
    for (const option of options) {
      map[option.id] = 0;
    }
    for (const response of responses) {
      for (const selected of response.selectedOptionIds || []) {
        map[selected] = (map[selected] ?? 0) + 1;
      }
    }
    return map;
  }, [options, responses]);

  const chartData = useMemo(() => {
    return options.map((option, i) => ({
      name: formatDateTime(option.startAt),
      value: countsByOption[option.id] ?? 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [options, countsByOption]);

  if (loading || !user) {
    return <main className="page-shell">טוען...</main>;
  }

  if (error) {
    return (
      <main className="page-shell">
        <section className="panel max-w-3xl">
          <p className="msg-error" role="alert">{error}</p>
          <Link href="/" className="btn-secondary mt-4 inline-flex">
            חזרה
          </Link>
        </section>
      </main>
    );
  }

  if (!appointment) {
    return <main className="page-shell">טוען פגישה...</main>;
  }

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/a/${appointment.publicToken}`
      : `/a/${appointment.publicToken}`;

  return (
    <main className="page-shell">
      <section className="panel w-full max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="kicker">ניהול פגישה</p>
            <h1 className="text-3xl font-black">{appointment.title}</h1>
          </div>
          <Link href="/" className="btn-secondary">
            חזרה לדשבורד
          </Link>
        </div>

        <div className="tile mb-6">
          <p className="font-bold">קישור שיתוף</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input readOnly className="min-w-[320px] flex-1" value={shareUrl} />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigator.clipboard.writeText(shareUrl)}
            >
              העתק
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="tile">
            <h2 className="text-2xl font-bold">הגדרות</h2>
            <div className="mt-3 grid gap-2">
              <label className="field">
                <span>אופן בחירה</span>
                <select
                  value={voteMode}
                  onChange={(e) => setVoteMode(e.target.value as VoteMode)}
                >
                  <option value="single">בודד</option>
                  <option value="limited">כמות מוגבלת</option>
                  <option value="unlimited">ללא הגבלה</option>
                </select>
              </label>
              {voteMode === "limited" ? (
                <label className="field">
                  <span>מקסימום בחירות</span>
                  <input
                    type="number"
                    min={1}
                    value={maxSelections}
                    onChange={(e) => setMaxSelections(Number(e.target.value))}
                  />
                </label>
              ) : null}
              <label className="field">
                <span>הצגת תוצאות</span>
                <select
                  value={resultsVisibility}
                  onChange={(e) =>
                    setResultsVisibility(
                      e.target.value as "hidden" | "after_submit" | "live",
                    )
                  }
                >
                  <option value="hidden">לא מוצג</option>
                  <option value="after_submit">אחרי שליחה</option>
                  <option value="live">בזמן אמת</option>
                </select>
              </label>
              <button
                type="button"
                className="btn-primary mt-2"
                disabled={savingSettings}
                onClick={async () => {
                  setSavingSettings(true);
                  await updateDoc(doc(db, "appointments", appointment.id), {
                    voteMode,
                    maxSelections: voteMode === "limited" ? maxSelections : null,
                    resultsVisibility,
                    updatedAt: serverTimestamp(),
                  });
                  const activityRef = doc(
                    db,
                    "appointments",
                    appointment.id,
                    "activity",
                    crypto.randomUUID(),
                  );
                  await setDoc(activityRef, {
                    type: "settings_change",
                    responseId: "",
                    contactFingerprint: user.uid,
                    timestamp: serverTimestamp(),
                    meta: { voteMode, maxSelections, resultsVisibility },
                  });
                  setSavingSettings(false);
                }}
              >
                {savingSettings ? "שומר..." : "שמור הגדרות"}
              </button>
            </div>
          </section>

          <section className="tile">
            <h2 className="text-2xl font-bold">תוצאות לפי מועדים</h2>
            <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="min-h-[240px] w-full lg:min-w-[280px] lg:max-w-[320px]">
                {chartData.some((d) => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) =>
                          value > 0 ? `${name}: ${value}` : ""
                        }
                      >
                        {chartData.map((entry, i) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--bg-overlay)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          color: "var(--text)",
                        }}
                        formatter={(value) => [value ?? 0, "בחירות"]}
                        labelFormatter={(label) => label}
                      />
                      <Legend
                        layout="vertical"
                        align="left"
                        verticalAlign="middle"
                        wrapperStyle={{ paddingRight: "16px" }}
                        formatter={(value, entry) => {
                          const payload = entry.payload as { value?: number };
                          return (
                            <span style={{ color: "var(--text)" }}>
                              {value}: {payload?.value ?? 0}
                            </span>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg)]">
                    <p className="text-[var(--text-muted)]">אין הצבעות עדיין</p>
                  </div>
                )}
              </div>
              <div className="grid flex-1 gap-2">
                {options.map((option) => (
                  <div key={option.id} className="tile bg-[var(--bg)]">
                    <p className="font-semibold">{formatDateTime(option.startAt)}</p>
                    <p className="mt-1 text-[var(--accent)] font-medium">סך בחירות: {countsByOption[option.id] ?? 0}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 tile overflow-auto">
          <h2 className="text-2xl font-bold">פעילות מלאה</h2>
          <table className="mt-3 w-full text-right">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="p-2">זמן</th>
                <th className="p-2">סוג פעולה</th>
                <th className="p-2">Response</th>
                <th className="p-2">מזהה</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)]">
                  <td className="p-2">{toDate(row.timestamp?.seconds)}</td>
                  <td className="p-2">{row.type}</td>
                  <td className="p-2">{row.responseId || "-"}</td>
                  <td className="p-2">{row.contactFingerprint || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6 tile overflow-auto">
          <h2 className="text-2xl font-bold">תגובות והערות מצביעים</h2>
          <table className="mt-3 w-full text-right">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="p-2">Response</th>
                <th className="p-2">מועדים שנבחרו</th>
                <th className="p-2">פרטי קשר</th>
                <th className="p-2">הערה</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)] align-top">
                  <td className="p-2">{row.id}</td>
                  <td className="p-2">{row.selectedOptionIds?.length ?? 0}</td>
                  <td className="p-2 text-sm text-[var(--text-muted)]">
                    {Object.entries(row.contact || {})
                      .filter(([, v]) => v != null && String(v).trim())
                      .map(([key, value]) => `${CONTACT_LABELS[key] ?? key}: ${String(value)}`)
                      .join(" | ") || "-"}
                  </td>
                  <td className="p-2 text-sm text-[var(--text)]">{row.note?.trim() || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}
