import type { APIRoute } from "astro";
import { absoluteUrl, localePath, type Locale } from "../lib/i18n/locale";
import { getContent } from "../lib/microcms/client";
import { noticeHasEnglish } from "../lib/microcms/mock";

function line(locale: Locale, title: string, path: string, summary: string): string {
  return `- [${title}](${absoluteUrl(localePath(locale, path))}): ${summary.replace(/\s+/g, " ")}`;
}

export const GET: APIRoute = async () => {
  const content = await getContent();
  const settings = content.settings;
  const ja: string[] = [
    line("ja", "トップ", "/", settings.description_ja),
    line("ja", "サービス", "/services", "クリエイティブ、マーケティング、AIの3領域。料金表はなく、見積りは個別です。"),
  ];
  for (const area of content.areas) {
    ja.push(line("ja", area.name_ja, `/services/${area.slug}`, area.aio_ja.summary));
  }
  for (const service of content.services) {
    ja.push(line("ja", service.name_ja, `/services/${service.slug}`, service.aio_ja.summary));
  }
  ja.push(
    line("ja", "会社紹介", "/we-are", settings.llms_intro_ja),
    line("ja", "編集方針", "/editorial-policy", "NeoLeverage編集部の編集方針。出典、AIの利用、訂正について。"),
    line("ja", "よくあるご質問", "/faq", "対応範囲、見積り、進め方についての質問。"),
    line("ja", "お問い合わせ", "/contact", "連絡はフォームのみです。電話番号とメールアドレスは掲載していません。"),
    line("ja", "お知らせ", "/notice", "会社からのお知らせ。"),
    line("ja", "Trends", "/trends", "現行サイトの見出しの一部を再掲した試作です。本文は移行前です。"),
  );
  for (const insight of content.insights) {
    if (insight.seo_ja.noindex) continue;
    ja.push(line("ja", insight.title_ja, `/trends/${insight.slug}`, insight.aio_ja.summary));
  }

  const en: string[] = [
    line("en", "Home", "/", settings.description_en),
    line("en", "Services", "/services", "Creative, marketing, and AI. There is no price list. Quotes are individual."),
  ];
  for (const area of content.areas) {
    en.push(line("en", area.name_en, `/services/${area.slug}`, area.aio_en.summary));
  }
  for (const service of content.services) {
    en.push(line("en", service.name_en, `/services/${service.slug}`, service.aio_en.summary));
  }
  en.push(
    line("en", "We Are", "/we-are", settings.llms_intro_en),
    line("en", "Editorial policy", "/editorial-policy", "How the NeoLeverage Editorial Team handles sources, AI assistance, and corrections."),
    line("en", "FAQ", "/faq", "Scope, quotes, and how an engagement starts."),
    line("en", "Contact", "/contact", "Contact is through the form only. No phone number and no email address are published."),
    line("en", "Notice", "/notice", "Company notices."),
    line("en", "Trends", "/trends", "A sample of headlines from the current site. English article bodies are not migrated, so those pages are noindex."),
  );
  for (const notice of content.notices) {
    if (!noticeHasEnglish(notice) || notice.seo_en?.noindex) continue;
    en.push(line("en", notice.title_en ?? notice.title_ja, `/notice/${notice.slug}`, notice.seo_en?.seo_description ?? notice.seo_ja.seo_description));
  }

  const text = [
    `# ${settings.legal_name_ja}`,
    "",
    `> ${settings.llms_intro_ja}`,
    "",
    `> ${settings.llms_intro_en}`,
    "",
    "## 日本語",
    "",
    ...ja,
    "",
    "## English",
    "",
    ...en,
    "",
  ].join("\n");

  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
