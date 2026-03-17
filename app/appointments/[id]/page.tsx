"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
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

function SortableOptionItem({
  option,
  voteCount,
  savingOrder,
}: {
  option: TimeOption;
  voteCount: number;
  savingOrder: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 ${isDragging ? "opacity-50" : ""}`}
    >
      <div
        className={`flex cursor-grab touch-none items-center justify-center rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text)] active:cursor-grabbing ${savingOrder ? "pointer-events-none opacity-50" : ""}`}
        {...attributes}
        {...listeners}
        aria-label="גרור לשינוי סדר"
      >
        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="font-semibold">{formatDateTime(option.startAt)}</p>
        <p className="text-sm text-[var(--accent)]">סך בחירות: {voteCount}</p>
      </div>
    </div>
  );
}

export default function AppointmentAdminPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [options, setOptions] = useState<TimeOption[]>([]);
  const [responses, setResponses] = useState<VoteResponse[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [error, setError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
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

      const opts = optionsSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<TimeOption, "id">),
      }));
      const order = data.timeOptionOrder as string[] | undefined;
      setOptions(
        order?.length
          ? [...opts].sort(
              (a, b) =>
                (order.indexOf(a.id) === -1 ? 999 : order.indexOf(a.id)) -
                (order.indexOf(b.id) === -1 ? 999 : order.indexOf(b.id)),
            )
          : opts,
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

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleOrderDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = options.findIndex((o) => o.id === active.id);
    const newIndex = options.findIndex((o) => o.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(options, oldIndex, newIndex);
    setOptions(next);
    setSavingOrder(true);
    await updateDoc(doc(db, "appointments", appointment!.id), {
      timeOptionOrder: next.map((o) => o.id),
      updatedAt: serverTimestamp(),
    });
    setSavingOrder(false);
  };

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
            {chartData.some((d) => d.value > 0) ? (
              <div className="mt-3 flex flex-col gap-6">
                <div className="flex justify-center" style={{ minHeight: isMobile ? 220 : 200 }}>
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 200}>
                    <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 32 : 40}
                        outerRadius={isMobile ? 68 : 80}
                        paddingAngle={2}
                        dataKey="value"
                        label={false}
                      >
                        {chartData.map((entry) => (
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
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div
                  className={`flex flex-wrap gap-x-4 gap-y-2 ${isMobile ? "flex-col" : "flex-row justify-center"}`}
                >
                  {chartData.map((entry) => (
                    <div
                      key={entry.name}
                      className="flex items-center gap-2"
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-[var(--text)]">
                        {entry.name}: {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 flex h-[200px] items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg)]">
                <p className="text-[var(--text-muted)]">אין הצבעות עדיין</p>
              </div>
            )}
          </section>

          <section className="tile">
            <h2 className="text-2xl font-bold">סדר מועדים</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              גרור לשינוי הסדר. הסדר יוצג גם בטופס ההצבעה.
            </p>
            <DndContext
              sensors={dndSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleOrderDragEnd}
            >
              <SortableContext
                items={options.map((o) => o.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="mt-3 grid gap-2">
                  {options.map((option) => (
                    <SortableOptionItem
                      key={option.id}
                      option={option}
                      voteCount={countsByOption[option.id] ?? 0}
                      savingOrder={savingOrder}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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
