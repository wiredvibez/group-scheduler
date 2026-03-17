import type { Metadata } from "next";
import { getAppointmentByToken } from "@/lib/get-appointment-by-token";
import ClientVotePage from "./ClientVotePage";

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.startsWith("http")
      ? process.env.NEXT_PUBLIC_APP_URL
      : `https://${process.env.NEXT_PUBLIC_APP_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://consilium-scheduler.vercel.app";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}): Promise<Metadata> {
  const { publicToken } = await params;
  const appointment = await getAppointmentByToken(publicToken);

  if (!appointment) {
    return {
      title: "האירוע לא נמצא | יאללה סגרנו",
    };
  }

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/a/${publicToken}`;
  const description =
    appointment.description || "טופס הצבעה למועדים — בחר את המועדים שמתאימים לך";

  return {
    title: `${appointment.title} | יאללה סגרנו`,
    description,
    openGraph: {
      title: appointment.title,
      description,
      url,
      type: "website",
      locale: "he_IL",
      siteName: "יאללה סגרנו",
    },
    twitter: {
      card: "summary",
      title: appointment.title,
      description,
    },
  };
}

export default async function PublicVotePage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  await params;
  return <ClientVotePage />;
}
