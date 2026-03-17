import { ContactFieldsConfig } from "@/lib/types";

export const DEFAULT_CONTACT_FIELDS: ContactFieldsConfig = {
  name: { enabled: true, required: true },
  phone: { enabled: false, required: false },
  email: { enabled: true, required: true },
  openQuestion: { enabled: false, required: false },
  birthday: { enabled: false, required: false },
  gender: { enabled: false, required: false },
  openQuestionLabel: "שאלה פתוחה",
};

export function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("he-IL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
