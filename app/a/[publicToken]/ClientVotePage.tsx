"use client";

import { useRouter, useParams } from "next/navigation";
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { getDeviceId } from "@/lib/device-id";
import {
  Appointment,
  ContactFieldKey,
  ResponseContact,
  TimeOption,
  VoteResponse,
} from "@/lib/types";
import { formatDateTime } from "@/lib/defaults";

const CONTACT_LABELS: Record<ContactFieldKey, string> = {
  name: "שם",
  phone: "טלפון",
  email: "אימייל",
  openQuestion: "שאלה פתוחה",
  birthday: "יום הולדת",
  gender: "מין",
};

export default function ClientVotePage() {
  const params = useParams<{ publicToken: string }>();
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [appointmentId, setAppointmentId] = useState("");
  const [options, setOptions] = useState<TimeOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [contact, setContact] = useState<ResponseContact>({});
  const [note, setNote] = useState("");
  const [existingResponseId, setExistingResponseId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [duplicateResponseId, setDuplicateResponseId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const token = params.publicToken;
        const appointmentSnap = await getDocs(
          query(
            collection(db, "appointments"),
            where("publicToken", "==", token),
            limit(1),
          ),
        );
        if (appointmentSnap.empty) {
          setError("האירוע לא נמצא.");
          return;
        }

        const item = appointmentSnap.docs[0];
        const itemData = item.data() as Omit<Appointment, "id">;
        setAppointment({ id: item.id, ...itemData });
        setAppointmentId(item.id);
        const optionsSnap = await getDocs(
          collection(db, "appointments", item.id, "timeOptions"),
        );
        setOptions(
          optionsSnap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<TimeOption, "id">),
          })),
        );

        const currentDeviceId = getDeviceId();
        setDeviceId(currentDeviceId);
        try {
          const existingSnap = await getDocs(
            query(
              collection(db, "appointments", item.id, "responses"),
              where("deviceId", "==", currentDeviceId),
              limit(1),
            ),
          );
          if (!existingSnap.empty) {
            const existing = existingSnap.docs[0];
            const existingData = existing.data() as Omit<VoteResponse, "id">;
            setExistingResponseId(existing.id);
            setSelected(existingData.selectedOptionIds ?? []);
            setContact(existingData.contact ?? {});
            setNote(existingData.note ?? "");
          }
        } catch (existingErr) {
          // Responses are read-restricted (owner only); continue without pre-fill
          console.warn("[ClientVotePage] Could not load existing response:", existingErr);
        }
      } catch (err) {
        console.error("[ClientVotePage] Load error:", err);
        setError("שגיאה בטעינה. נסה שוב.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [params.publicToken]);

  const maxAllowed = useMemo(() => {
    if (!appointment) return Infinity;
    if (appointment.voteMode === "single") return 1;
    if (appointment.voteMode === "limited")
      return appointment.maxSelections ?? 1;
    return Infinity;
  }, [appointment]);

  if (loading) {
    return (
      <main className="page-shell">
        <div className="panel max-w-4xl w-full">
          <div className="skeleton h-6 w-24 rounded mb-4" />
          <div className="skeleton h-10 w-64 rounded mb-6" />
          <div className="skeleton h-32 w-full rounded-lg" />
        </div>
      </main>
    );
  }

  if (error || !appointment) {
    return (
      <main className="page-shell">
        <section className="panel max-w-2xl">
          <p className="msg-error" role="alert">
            {error || "שגיאה בטעינה"}
          </p>
          <button
            type="button"
            className="btn-primary mt-4"
            onClick={() => window.location.reload()}
          >
            נסה שוב
          </button>
        </section>
      </main>
    );
  }

  const toggleSelection = (id: string) => {
    setSelected((prev) => {
      if (appointment.voteMode === "single") return [id];
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= maxAllowed) return prev;
      return [...prev, id];
    });
  };

  const enabledContactFields = (
    Object.keys(CONTACT_LABELS) as ContactFieldKey[]
  ).filter((key) => appointment.contactFieldsConfig?.[key]?.enabled);

  const validateContactFields = (): string | null => {
    for (const key of enabledContactFields) {
      if (
        appointment.contactFieldsConfig[key].required &&
        !String(contact[key] || "").trim()
      ) {
        return `השדה "${CONTACT_LABELS[key]}" הוא שדה חובה.`;
      }
    }
    return null;
  };

  const upsert = async (
    targetResponseId?: string,
    mode: "submit" | "update" = "submit",
  ) => {
    const responseId = targetResponseId || crypto.randomUUID();
    await setDoc(
      doc(db, "appointments", appointmentId, "responses", responseId),
      {
        deviceId,
        selectedOptionIds: selected,
        contact,
        note: note.trim(),
        status: mode === "submit" ? "submitted" : "updated",
        createdAt:
          existingResponseId || targetResponseId ? undefined : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    await setDoc(
      doc(db, "appointments", appointmentId, "activity", crypto.randomUUID()),
      {
        type: mode,
        responseId,
        deviceId,
        contactFingerprint:
          [contact.email, contact.phone].filter(Boolean).join(" | ") ||
          contact.name ||
          "—",
        timestamp: serverTimestamp(),
        meta: { selectedOptionIds: selected },
      },
    );
  };

  return (
    <main className="page-shell">
      <section className="panel w-full max-w-4xl">
        <p className="kicker">טופס הצבעה</p>
        <h1 className="text-4xl font-black">{appointment.title}</h1>
        {appointment.description ? (
          <p className="mt-2 text-[var(--text-muted)]">
            {appointment.description}
          </p>
        ) : null}

        <section className="mt-6">
          <h2 className="text-2xl font-bold">בחר מועדים שמתאימים לך</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            נדרשת לפחות בחירה אחת.
            {appointment.voteMode === "single"
              ? " ניתן לבחור מועד אחד בלבד."
              : appointment.voteMode === "limited"
                ? ` ניתן לבחור עד ${maxAllowed} מועדים.`
                : " ניתן לבחור כמה מועדים שתרצה."}
          </p>
          <div className="mt-3 grid gap-2">
            {options.map((option) => (
              <button
                type="button"
                key={option.id}
                className={`vote-option ${selected.includes(option.id) ? "selected" : ""}`}
                onClick={() => toggleSelection(option.id)}
              >
                <span className="text-lg font-bold">
                  {formatDateTime(option.startAt)}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-3 md:grid-cols-2">
          {enabledContactFields.map((fieldKey) => (
            <label className="field" key={fieldKey}>
              <span>
                {(() => {
                  const baseLabel =
                    fieldKey === "openQuestion"
                      ? appointment.contactFieldsConfig.openQuestionLabel ||
                        CONTACT_LABELS[fieldKey]
                      : CONTACT_LABELS[fieldKey];
                  return appointment.contactFieldsConfig[fieldKey].required
                    ? baseLabel
                    : `${baseLabel} (אופציונלי)`;
                })()}
              </span>
              {fieldKey === "gender" ? (
                <select
                  value={String(contact[fieldKey] || "")}
                  onChange={(e) =>
                    setContact((prev) => ({ ...prev, [fieldKey]: e.target.value }))
                  }
                >
                  <option value="">בחר</option>
                  <option value="male">זכר</option>
                  <option value="female">נקבה</option>
                  <option value="other">אחר</option>
                </select>
              ) : (
                <input
                  type={fieldKey === "birthday" ? "date" : "text"}
                  value={String(contact[fieldKey] || "")}
                  onChange={(e) =>
                    setContact((prev) => ({ ...prev, [fieldKey]: e.target.value }))
                  }
                />
              )}
            </label>
          ))}
        </section>
        <section className="mt-4">
          <label className="field">
            <span>הערה למארגן (אופציונלי)</span>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="אפשר לכתוב כל הערה רלוונטית לפני השליחה"
            />
          </label>
        </section>

        {duplicateResponseId ? (
          <div className="mt-5 tile border-[var(--danger)] bg-[var(--danger-bg)]">
            <p className="font-bold">
              נמצאה הצבעה קיימת עם פרטי הקשר האלו.
            </p>
            <p className="mt-1 text-[var(--text)]">
              האם לעדכן את ההצבעה הקיימת?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  await upsert(duplicateResponseId, "update");
                  router.push(`/a/${params.publicToken}/done`);
                }}
              >
                עדכן הצבעה קיימת
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={() => setDuplicateResponseId("")}
              >
                בטל
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="msg-error mt-4" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          className="btn-primary mt-6"
          disabled={saving}
          onClick={async () => {
            setError("");
            if (selected.length < 1) {
              setError("יש לבחור לפחות מועד אחד.");
              return;
            }
            if (selected.length > maxAllowed) {
              setError("חרגת ממספר הבחירות המותר.");
              return;
            }
            const fieldError = validateContactFields();
            if (fieldError) {
              setError(fieldError);
              return;
            }

            setSaving(true);

            try {
              if (existingResponseId) {
                await upsert(existingResponseId, "update");
                router.push(`/a/${params.publicToken}/done`);
                return;
              }

              let foundDuplicateResponseId = "";
              if (contact.email) {
                const emailSnap = await getDocs(
                  query(
                    collection(db, "appointments", appointmentId, "responses"),
                    where("contact.email", "==", contact.email),
                    limit(1),
                  ),
                );
                if (!emailSnap.empty) {
                  foundDuplicateResponseId = emailSnap.docs[0].id;
                }
              }
              if (!foundDuplicateResponseId && contact.phone) {
                const phoneSnap = await getDocs(
                  query(
                    collection(db, "appointments", appointmentId, "responses"),
                    where("contact.phone", "==", contact.phone),
                    limit(1),
                  ),
                );
                if (!phoneSnap.empty) {
                  foundDuplicateResponseId = phoneSnap.docs[0].id;
                }
              }

              if (foundDuplicateResponseId) {
                setDuplicateResponseId(foundDuplicateResponseId);
                setSaving(false);
                return;
              }

              await upsert(undefined, "submit");
              router.push(`/a/${params.publicToken}/done`);
            } catch {
              setError("שמירה נכשלה. נסה שוב.");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving
            ? "שומר..."
            : existingResponseId
              ? "עדכן הצבעה"
              : "שלח הצבעה"}
        </button>
      </section>
    </main>
  );
}
