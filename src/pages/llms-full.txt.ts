import type { APIRoute } from "astro";
import { getContent } from "../lib/microcms/client";

export const GET: APIRoute = async () => {
  const content = await getContent();
  const settings = content.settings;
  const blocks: string[] = [
    settings.legal_name_ja,
    settings.legal_name_en,
    `読み: ${settings.name_kana}`,
    "",
    settings.llms_intro_ja,
    settings.llms_intro_en,
    "",
    `設立: ${settings.founding_date}`,
    "",
    "拠点",
  ];

  for (const office of settings.offices) {
    const role = office.is_headquarters ? "本店" : "拠点";
    blocks.push(
      `${role} ${office.name} / ${office.name_en}`,
      `〒${office.postal_code} ${office.address_region}${office.address_locality}${office.street_address}`,
      office.address_en,
      "",
    );
  }

  blocks.push("事業", ...settings.business_summary_ja.map((item) => `- ${item}`), "", "見積り", settings.quote_policy_ja, settings.quote_policy_en, "");

  for (const area of content.areas) {
    blocks.push(`# ${area.name_ja}`, area.lead_ja, area.aio_ja.summary, area.lead_en, "");
  }

  for (const service of content.services) {
    blocks.push(
      `# ${service.name_ja} / ${service.name_en}`,
      service.summary_ja,
      service.summary_en,
      service.solution_ja,
      `期間: ${service.timeline_note_ja}`,
      "",
    );
  }

  blocks.push("連絡は https://neolev.jp/contact のフォームのみ。電話番号とメールアドレスは掲載していない。");

  return new Response(`${blocks.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
