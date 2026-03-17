export type VoteMode = "single" | "limited" | "unlimited";

export type ResultsVisibility = "hidden" | "after_submit" | "live";

export type ContactFieldKey =
  | "name"
  | "phone"
  | "email"
  | "openQuestion"
  | "birthday"
  | "gender";

export type ContactFieldConfig = {
  enabled: boolean;
  required: boolean;
};

export type ContactFieldsConfig = Record<ContactFieldKey, ContactFieldConfig> & {
  openQuestionLabel: string;
};

export type Appointment = {
  id: string;
  ownerUid: string;
  title: string;
  description?: string;
  timezone: string;
  voteMode: VoteMode;
  maxSelections: number | null;
  resultsVisibility: ResultsVisibility;
  contactFieldsConfig: ContactFieldsConfig;
  publicToken: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type TimeOption = {
  id: string;
  startAt: string;
  createdAt?: unknown;
};

export type ResponseContact = Partial<Record<ContactFieldKey, string>>;

export type VoteResponse = {
  id: string;
  deviceId: string;
  selectedOptionIds: string[];
  contact: ResponseContact;
  note?: string;
  status: "submitted" | "updated";
  createdAt?: unknown;
  updatedAt?: unknown;
};
