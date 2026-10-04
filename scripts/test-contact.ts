import { onRequestPost } from "../functions/api/contact.ts";
import { validateContact } from "../src/lib/contact/validate.ts";

const bad = validateContact({ name: "", email: "nope", message: "", topic: "nope" }, { requireTurnstile: false });
if (bad.ok) throw new Error("expected invalid");

const good = validateContact(
  {
    name: "テスト",
    company: "Example",
    email: "person@example.com",
    phone: "",
    topic: "ai-automation",
    message: "状況を相談したい",
    website: "",
    startedAt: Date.now() - 5000,
    locale: "ja",
    turnstileToken: "",
  },
  { requireTurnstile: false },
);
if (!good.ok) throw new Error("expected valid");

const bot = validateContact({ ...good.value, website: "http://spam.test" }, { requireTurnstile: false });
if (bot.ok) throw new Error("honeypot should fail");

const priced = JSON.stringify(good);
if (priced.includes("offers") || priced.includes("price")) throw new Error("unexpected");

const request = new Request("https://neolev.jp/api/contact", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(good.value),
});
const response = await onRequestPost({ request, env: {} });
const payload = (await response.json()) as { ok?: boolean; mocked?: boolean };
if (!response.ok || !payload.ok || !payload.mocked) throw new Error("expected mocked send");

console.log("contact validation ok");
