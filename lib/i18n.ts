export type Locale = "he" | "en";

type Dictionary = Record<string, string>;

const he: Dictionary = {
  appName: "יאללה סגרנו",
  authTitle: "התחברות למערכת",
  authSubtitle: "ניהול תיאום פגישות ושיתוף הצבעות לקבוצה",
  signInGoogle: "התחברות עם Google",
  signOut: "התנתק",
  dashboardTitle: "הפגישות שלי",
  createAppointment: "יצירת פגישה חדשה",
  noAppointments: "עדיין לא יצרת פגישות.",
  appointmentTitle: "כותרת הפגישה",
  appointmentDescription: "תיאור (אופציונלי)",
  timezone: "אזור זמן",
  voteMode: "אופן בחירה",
  single: "בחירה בודדת",
  limited: "בחירה מוגבלת",
  unlimited: "ללא הגבלה",
  maxSelections: "מקסימום בחירות",
  resultsVisibility: "הצגת תוצאות למצביעים",
  visibilityHidden: "מוסתר",
  visibilityAfterSubmit: "רק לאחר שליחה",
  visibilityLive: "בזמן אמת",
  addTimeOption: "הוספת מועד",
  saveAppointment: "שמור פגישה",
  shareLink: "קישור שיתוף",
  adminPanel: "ניהול פגישה",
  results: "תוצאות",
  activity: "פעילות",
  submitVote: "שליחת הצבעה",
  updateVote: "עדכון הצבעה",
  doneTitle: "ההגשה נשמרה בהצלחה",
  doneBody:
    "מארגן הפגישה יראה את כל התשובות וייצור קשר בהקדם לקביעת מועד ושעה סופיים.",
};

const en: Dictionary = {
  appName: "Yalla Sagarnu",
  authTitle: "Sign in",
  authSubtitle: "Coordinate group scheduling and voting",
  signInGoogle: "Sign in with Google",
  signOut: "Sign out",
  dashboardTitle: "My appointments",
  createAppointment: "Create new appointment",
  noAppointments: "No appointments yet.",
  appointmentTitle: "Appointment title",
  appointmentDescription: "Description (optional)",
  timezone: "Timezone",
  voteMode: "Vote mode",
  single: "Single",
  limited: "Limited",
  unlimited: "Unlimited",
  maxSelections: "Max selections",
  resultsVisibility: "Results visibility",
  visibilityHidden: "Hidden",
  visibilityAfterSubmit: "After submit",
  visibilityLive: "Live",
  addTimeOption: "Add time option",
  saveAppointment: "Save appointment",
  shareLink: "Share link",
  adminPanel: "Appointment admin",
  results: "Results",
  activity: "Activity",
  submitVote: "Submit vote",
  updateVote: "Update vote",
  doneTitle: "Response saved",
  doneBody:
    "The organizer will review all responses and contact everyone soon with the final date and time.",
};

const dictionaries: Record<Locale, Dictionary> = { he, en };

export function t(locale: Locale, key: string): string {
  return dictionaries[locale][key] ?? key;
}
