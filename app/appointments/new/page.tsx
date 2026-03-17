"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { DEFAULT_CONTACT_FIELDS } from "@/lib/defaults";
import { ContactFieldKey, ResultsVisibility, VoteMode } from "@/lib/types";

type TimeDraft = {
  id: string;
  startAt: string;
};

const CONTACT_LABELS: Record<ContactFieldKey, string> = {
  name: "שם",
  phone: "טלפון",
  email: "אימייל",
  openQuestion: "שאלה פתוחה",
  birthday: "יום הולדת",
  gender: "מין",
};

function makeId() {
  return crypto.randomUUID().slice(0, 8);
}

function SortableTimeItem({
  time,
  index,
  onRemove,
  onStartAtChange,
  canRemove,
}: {
  time: TimeDraft;
  index: number;
  onRemove: () => void;
  onStartAtChange: (value: string) => void;
  canRemove: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: time.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`tile grid gap-2 md:grid-cols-[auto_1fr_auto] ${isDragging ? "opacity-50" : ""}`}
    >
      <div
        className="flex cursor-grab touch-none items-center justify-center self-center rounded p-2 text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="גרור לשינוי סדר"
      >
        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      <label className="field">
        <span>מועד #{index + 1}</span>
        <input
          type="datetime-local"
          value={time.startAt}
          onChange={(e) => onStartAtChange(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="btn-secondary self-end"
        disabled={canRemove}
        onClick={onRemove}
      >
        הסר
      </button>
    </div>
  );
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState("Asia/Jerusalem");
  const [voteMode, setVoteMode] = useState<VoteMode>("limited");
  const [maxSelections, setMaxSelections] = useState(3);
  const [resultsVisibility, setResultsVisibility] =
    useState<ResultsVisibility>("after_submit");
  const [fields, setFields] = useState(DEFAULT_CONTACT_FIELDS);
  const [times, setTimes] = useState<TimeDraft[]>([
    { id: makeId(), startAt: "" },
  ]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [loading, user, router]);

  const canSubmit = useMemo(() => {
    return (
      title.trim().length > 1 &&
      times.some((time) => time.startAt.trim()) &&
      !(voteMode === "limited" && maxSelections < 1)
    );
  }, [title, times, voteMode, maxSelections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTimes((prev) => {
        const oldIndex = prev.findIndex((t) => t.id === active.id);
        const newIndex = prev.findIndex((t) => t.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  if (loading || !user) {
    return <main className="page-shell">טוען...</main>;
  }

  return (
    <main className="page-shell">
      <section className="panel w-full max-w-4xl">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-3xl font-black">יצירת פגישה חדשה</h1>
          <Link href="/" className="btn-secondary">
            חזרה
          </Link>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>כותרת</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="field">
            <span>תיאור</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="field">
            <span>אזור זמן</span>
            <input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </label>
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
            <span>הצגת תוצאות למצביעים</span>
            <select
              value={resultsVisibility}
              onChange={(e) =>
                setResultsVisibility(e.target.value as ResultsVisibility)
              }
            >
              <option value="hidden">לא מוצג</option>
              <option value="after_submit">לאחר שליחה בלבד</option>
              <option value="live">בזמן אמת</option>
            </select>
          </label>
        </div>

        <section className="mt-8">
          <h2 className="text-2xl font-bold">שדות איסוף נתונים</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(Object.keys(CONTACT_LABELS) as ContactFieldKey[]).map((key) => (
              <div className="tile" key={key}>
                <p className="font-bold">{CONTACT_LABELS[key]}</p>
                <div className="mt-2 flex items-center gap-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={fields[key].enabled}
                      onChange={(e) =>
                        setFields((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], enabled: e.target.checked },
                        }))
                      }
                    />
                    פעיל
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={fields[key].required}
                      disabled={!fields[key].enabled}
                      onChange={(e) =>
                        setFields((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], required: e.target.checked },
                        }))
                      }
                    />
                    חובה
                  </label>
                </div>
              </div>
            ))}
          </div>
          {fields.openQuestion.enabled ? (
            <label className="field mt-3">
              <span>טקסט שאלה פתוחה</span>
              <input
                value={fields.openQuestionLabel}
                onChange={(e) =>
                  setFields((prev) => ({ ...prev, openQuestionLabel: e.target.value }))
                }
              />
            </label>
          ) : null}
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-2xl font-bold">מועדים מוצעים</h2>
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                setTimes((prev) => [
                  ...prev,
                  { id: makeId(), startAt: "" },
                ])
              }
            >
              הוסף מועד
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={times.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="grid gap-3">
                {times.map((time, index) => (
                  <SortableTimeItem
                    key={time.id}
                    time={time}
                    index={index}
                    onRemove={() =>
                      setTimes((prev) => prev.filter((item) => item.id !== time.id))
                    }
                    onStartAtChange={(value) =>
                      setTimes((prev) =>
                        prev.map((item) =>
                          item.id === time.id ? { ...item, startAt: value } : item,
                        ),
                      )
                    }
                    canRemove={times.length === 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        {error ? <p className="msg-error mt-4" role="alert">{error}</p> : null}

        <button
          type="button"
          className="btn-primary mt-8"
          disabled={!canSubmit || saving}
          onClick={async () => {
            if (!canSubmit) {
              return;
            }
            setSaving(true);
            setError("");
            try {
              const validTimes = times.filter((time) => time.startAt);
              const timeOptionOrder = validTimes.map((t) => t.id);
              const publicToken = crypto.randomUUID().replaceAll("-", "").slice(0, 22);
              const appointmentRef = await addDoc(collection(db, "appointments"), {
                ownerUid: user.uid,
                title: title.trim(),
                description: description.trim(),
                timezone,
                voteMode,
                maxSelections: voteMode === "limited" ? maxSelections : null,
                resultsVisibility,
                contactFieldsConfig: fields,
                publicToken,
                timeOptionOrder,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });

              const optionWrites = validTimes.map((time) =>
                setDoc(doc(db, "appointments", appointmentRef.id, "timeOptions", time.id), {
                  startAt: time.startAt,
                  createdAt: serverTimestamp(),
                }),
              );

              await Promise.all(optionWrites);
              router.replace(`/appointments/${appointmentRef.id}`);
            } catch {
              setError("שמירת הפגישה נכשלה. בדוק הגדרות Firebase ונסה שוב.");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "שומר..." : "שמור פגישה"}
        </button>
      </section>
    </main>
  );
}
