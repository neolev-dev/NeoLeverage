export const CONTACT_TOPICS = ["production", "marketing", "ai-automation", "photo-sns-video", "other"] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export type ContactInput = {
  name: string;
  company: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
  website: string;
  startedAt: number;
  locale: "ja" | "en";
  turnstileToken: string;
};

export type ContactErrors = Partial<Record<"name" | "email" | "message" | "topic" | "form", string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emptyContact(locale: "ja" | "en" = "ja"): ContactInput {
  return {
    name: "",
    company: "",
    email: "",
    phone: "",
    topic: "",
    message: "",
    website: "",
    startedAt: Date.now(),
    locale,
    turnstileToken: "",
  };
}

export function validateContact(input: Partial<ContactInput>, options: { requireTurnstile: boolean }): { ok: true; value: ContactInput } | { ok: false; errors: ContactErrors } {
  const value: ContactInput = {
    name: (input.name ?? "").trim(),
    company: (input.company ?? "").trim(),
    email: (input.email ?? "").trim(),
    phone: (input.phone ?? "").trim(),
    topic: (input.topic ?? "").trim(),
    message: (input.message ?? "").trim(),
    website: input.website ?? "",
    startedAt: Number(input.startedAt ?? 0),
    locale: input.locale === "en" ? "en" : "ja",
    turnstileToken: (input.turnstileToken ?? "").trim(),
  };

  const errors: ContactErrors = {};
  if (value.website) errors.form = "rejected";
  if (!value.name || value.name.length > 80) errors.name = "name";
  if (!EMAIL.test(value.email) || value.email.length > 120) errors.email = "email";
  if (!value.message || value.message.length > 4000) errors.message = "message";
  if (!CONTACT_TOPICS.includes(value.topic as ContactTopic)) errors.topic = "topic";
  if (value.company.length > 120) errors.form = "rejected";
  if (value.phone.length > 40) errors.form = "rejected";
  if (options.requireTurnstile && !value.turnstileToken) errors.form = "turnstile";
  if (value.startedAt && Date.now() - value.startedAt < 1500) errors.form = "rejected";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}
