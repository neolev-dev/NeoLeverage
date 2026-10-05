import type { APIRoute } from "astro";
import { absoluteUrl, localePath } from "../lib/i18n/locale";
import { indexablePairs } from "../lib/seo/indexable";

function loc(path: string): string {
  return absoluteUrl(localePath("ja", path)).replace(/&/g, "&amp;");
}

function enLoc(path: string): string {
  return absoluteUrl(localePath("en", path)).replace(/&/g, "&amp;");
}

export const GET: APIRoute = async () => {
  const pairs = await indexablePairs();
  const urls: string[] = [];

  for (const pair of pairs) {
    const ja = loc(pair.ja);
    const en = pair.en ? enLoc(pair.en) : null;
    const alternates = en
      ? [
          `    <xhtml:link rel="alternate" hreflang="ja" href="${ja}" />`,
          `    <xhtml:link rel="alternate" hreflang="en" href="${en}" />`,
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${ja}" />`,
        ].join("\n")
      : "";
    urls.push(`  <url>\n    <loc>${ja}</loc>\n    <lastmod>${pair.lastmod}</lastmod>\n${alternates}\n  </url>`);
    if (en) {
      urls.push(`  <url>\n    <loc>${en}</loc>\n    <lastmod>${pair.lastmod}</lastmod>\n${alternates}\n  </url>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
