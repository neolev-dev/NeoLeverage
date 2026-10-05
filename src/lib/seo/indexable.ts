import { getContent } from "../microcms/client";
import { noticeHasEnglish } from "../microcms/mock";

/** Date the prototype copy was assembled. Pages without their own date use this. */
export const PROTOTYPE_DATE = "2026-10-04";

export type UrlPair = {
  ja: string;
  en: string | null;
  lastmod: string;
};

function latest(dates: string[]): string {
  return dates.reduce((max, date) => (date > max ? date : max), PROTOTYPE_DATE);
}

export async function indexablePairs(): Promise<UrlPair[]> {
  const content = await getContent();
  const pairs: UrlPair[] = [
    { ja: "/", en: "/", lastmod: PROTOTYPE_DATE },
    { ja: "/services", en: "/services", lastmod: PROTOTYPE_DATE },
    ...content.areas.map((area) => ({ ja: `/services/${area.slug}`, en: `/services/${area.slug}`, lastmod: PROTOTYPE_DATE })),
    ...content.services.map((service) => ({ ja: `/services/${service.slug}`, en: `/services/${service.slug}`, lastmod: PROTOTYPE_DATE })),
    { ja: "/we-are", en: "/we-are", lastmod: PROTOTYPE_DATE },
    { ja: "/editorial-policy", en: "/editorial-policy", lastmod: PROTOTYPE_DATE },
    { ja: "/privacy", en: "/privacy", lastmod: PROTOTYPE_DATE },
    { ja: "/faq", en: "/faq", lastmod: PROTOTYPE_DATE },
    { ja: "/contact", en: "/contact", lastmod: PROTOTYPE_DATE },
    { ja: "/notice", en: "/notice", lastmod: latest(content.notices.map((notice) => notice.date)) },
    { ja: "/trends", en: "/trends", lastmod: latest(content.insights.map((insight) => insight.published_at)) },
    ...content.categories.map((category) => ({
      ja: `/trends/category/${category.slug}`,
      en: `/trends/category/${category.slug}`,
      lastmod: latest(content.insights.filter((insight) => insight.category === category.slug).map((insight) => insight.published_at)),
    })),
  ];

  for (const notice of content.notices) {
    if (notice.seo_ja.noindex || notice.seo_ja.exclude_from_sitemap) continue;
    const english = noticeHasEnglish(notice) && !notice.seo_en?.noindex && !notice.seo_en?.exclude_from_sitemap;
    pairs.push({
      ja: `/notice/${notice.slug}`,
      en: english ? `/notice/${notice.slug}` : null,
      lastmod: notice.date,
    });
  }

  for (const insight of content.insights) {
    if (insight.seo_ja.noindex || insight.seo_ja.exclude_from_sitemap) continue;
    const english = !insight.seo_en.noindex && !insight.seo_en.exclude_from_sitemap;
    pairs.push({
      ja: `/trends/${insight.slug}`,
      en: english ? `/trends/${insight.slug}` : null,
      lastmod: insight.published_at,
    });
  }

  return pairs;
}
