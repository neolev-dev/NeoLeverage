import { validateContact } from "../../src/lib/contact/validate.ts";

type Env = {
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
  TURNSTILE_SECRET_KEY?: string;
};

const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

async function turnstileOk(secret: string | undefined, token: string, ip: string): Promise<boolean> {
  if (!secret) return true;
  if (!token) return false;
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  body.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  if (!response.ok) return false;
  const data = (await response.json()) as { success?: boolean };
  return Boolean(data.success);
}

async function sendMail(env: Env, to: string, subject: string, text: string, replyTo?: string): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.CONTACT_FROM) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [to],
      subject,
      text,
      reply_to: replyTo,
    }),
  });
  return response.ok;
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  if (limited(ip)) return Response.json({ ok: false, error: "limited" }, { status: 429 });

  const contentType = request.headers.get("content-type") ?? "";
  const raw = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries(await request.formData());
  const input = raw as Record<string, string>;
  const result = validateContact(
    {
      name: input.name,
      company: input.company,
      email: input.email,
      phone: input.phone,
      topic: input.topic,
      message: input.message,
      website: input.website,
      startedAt: Number(input.startedAt || 0),
      locale: input.locale === "en" ? "en" : "ja",
      turnstileToken: input.turnstileToken || input["cf-turnstile-response"] || "",
    },
    { requireTurnstile: Boolean(env.TURNSTILE_SECRET_KEY) },
  );

  const wantsJson = contentType.includes("application/json");
  const fail = (status: number) => (wantsJson ? Response.json({ ok: false }, { status }) : Response.redirect(new URL("/contact", request.url), 303));
  if (!result.ok) return fail(400);
  if (!(await turnstileOk(env.TURNSTILE_SECRET_KEY, result.value.turnstileToken, ip))) return fail(400);

  const mocked = !env.RESEND_API_KEY;
  if (!mocked) {
    const to = env.CONTACT_TO || "contract@neolev.jp";
    const text = [
      `name: ${result.value.name}`,
      `company: ${result.value.company}`,
      `email: ${result.value.email}`,
      `phone: ${result.value.phone}`,
      `topic: ${result.value.topic}`,
      "",
      result.value.message,
    ].join("\n");
    const sent = await sendMail(env, to, `Contact / ${result.value.topic}`, text, result.value.email);
    if (!sent) return fail(502);
    if (env.CONTACT_FROM) {
      const reply = result.value.locale === "en"
        ? "We received your message. We will reply within two to three business days."
        : "お問い合わせを受け付けました。2〜3営業日以内にご連絡します。";
      await sendMail(env, result.value.email, result.value.locale === "en" ? "We received your message" : "お問い合わせを受け付けました", reply);
    }
  }

  if (!wantsJson) {
    const thanks = result.value.locale === "en" ? "/en/contact/thanks" : "/contact/thanks";
    return Response.redirect(new URL(thanks, request.url), 303);
  }
  return Response.json({ ok: true, mocked });
}
