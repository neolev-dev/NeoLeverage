import type { APIRoute } from "astro";
import { absoluteUrl, localePath } from "../../lib/i18n/locale";
import { getContent } from "../../lib/microcms/client";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const GET: APIRoute = async () => {
  const content = await getContent();
  const items = content.insights
    .filter((insight) => !insight.seo_ja.noindex && !insight.seo_ja.exclude_from_sitemap)
    .map((insight) => {
      const url = absoluteUrl(localePath("ja", `/trends/${insight.slug}`));
      const pub = new Date(`${insight.published_at}T00:00:00Z`).toUTCString();
      return `    <item>
      <title>${escapeXml(insight.title_ja)}</title>
      <link>${escapeXml(url)}</link>
      <guid>${escapeXml(url)}</guid>
      <pubDate>${pub}</pubDate>
      <description>${escapeXml(insight.aio_ja.summary)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Trends | NeoLeverage株式会社</title>
    <link>${absoluteUrl("/trends")}</link>
    <description>${escapeXml(content.settings.editorial_description_ja)}</description>
    <language>ja</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
