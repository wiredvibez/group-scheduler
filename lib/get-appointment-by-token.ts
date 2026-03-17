import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Appointment } from "@/lib/types";

export async function getAppointmentByToken(
  publicToken: string,
): Promise<{ id: string } & Omit<Appointment, "id"> | null> {
  const snapshot = await getDocs(
    query(
      collection(db, "appointments"),
      where("publicToken", "==", publicToken),
      limit(1),
    ),
  );
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...(doc.data() as Omit<Appointment, "id">) };
}
