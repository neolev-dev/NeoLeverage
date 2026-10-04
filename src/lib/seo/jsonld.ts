import type { Locale } from "../i18n/locale";
import { absoluteUrl } from "../i18n/locale";
import { SITE } from "../site";
import type { Faq, Insight, Notice, Service, SiteSettings } from "../microcms/types";

export type Crumb = { name: string; href: string };

type Node = Record<string, unknown>;

function postal(office: SiteSettings["offices"][number]): Node {
  return {
    "@type": "PostalAddress",
    name: office.name,
    postalCode: office.postal_code,
    addressRegion: office.address_region,
    addressLocality: office.address_locality,
    streetAddress: office.street_address,
    addressCountry: "JP",
  };
}

export function organizationGraph(settings: SiteSettings, locale: Locale): Node[] {
  const hq = settings.offices.find((office) => office.is_headquarters) ?? settings.offices[0];
  const description = locale === "ja" ? settings.description_ja : settings.description_en;
  const knows = locale === "ja" ? settings.knows_about_ja : settings.knows_about_en;
  const contactPath = locale === "ja" ? "/contact" : "/en/contact";

  const organization: Node = {
    "@type": "Organization",
    "@id": SITE.organizationId,
    name: settings.legal_name_ja,
    legalName: settings.legal_name_ja,
    alternateName: [settings.legal_name_en, settings.name_kana],
    url: `${SITE.origin}/`,
    logo: { "@id": SITE.logoId },
    description,
    foundingDate: settings.founding_date,
    address: postal(hq),
    location: settings.offices.map((office) => ({
      "@type": "Place",
      name: office.name,
      address: postal(office),
    })),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      url: absoluteUrl(contactPath),
      availableLanguage: ["ja", "en"],
    },
    taxID: settings.corporate_number,
    iso6523Code: `0188:${settings.corporate_number}`,
    identifier: {
      "@type": "PropertyValue",
      propertyID: "JP Corporate Number",
      name: "法人番号",
      value: settings.corporate_number,
    },
    knowsAbout: knows,
    areaServed: "JP",
  };

  if (settings.same_as.length > 0) organization.sameAs = settings.same_as;

  const logo: Node = {
    "@type": "ImageObject",
    "@id": SITE.logoId,
    url: absoluteUrl(SITE.logoPath),
    contentUrl: absoluteUrl(SITE.logoPath),
    width: 1200,
    height: 1200,
    caption: settings.legal_name_ja,
  };

  const website: Node = {
    "@type": "WebSite",
    "@id": SITE.websiteId,
    url: `${SITE.origin}/`,
    name: settings.site_name,
    alternateName: settings.site_alternate_names,
    description,
    inLanguage: ["ja", "en"],
    publisher: { "@id": SITE.organizationId },
  };

  return [organization, logo, website];
}

export function editorialNode(settings: SiteSettings, locale: Locale): Node {
  return {
    "@type": "Organization",
    "@id": SITE.editorialId,
    name: settings.editorial_name_ja,
    alternateName: settings.editorial_name_en,
    parentOrganization: { "@id": SITE.organizationId },
    url: absoluteUrl(locale === "ja" ? "/trends" : "/en/trends"),
  };
}

export function breadcrumbNode(canonical: string, crumbs: Crumb[]): Node {
  return {
    "@type": "BreadcrumbList",
    "@id": `${canonical}#breadcrumb`,
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.href),
    })),
  };
}

export function pageNode(options: {
  canonical: string;
  locale: Locale;
  type?: string;
  name: string;
  description: string;
  about?: boolean;
  breadcrumb?: boolean;
}): Node {
  const node: Node = {
    "@type": options.type ?? "WebPage",
    "@id": `${options.canonical}#webpage`,
    url: options.canonical,
    name: options.name,
    description: options.description,
    isPartOf: { "@id": SITE.websiteId },
    inLanguage: options.locale,
  };
  if (options.about) node.about = { "@id": SITE.organizationId };
  if (options.breadcrumb) node.breadcrumb = { "@id": `${options.canonical}#breadcrumb` };
  return node;
}

export function serviceNode(service: Service, locale: Locale, canonical: string): Node {
  return {
    "@type": "Service",
    "@id": `${canonical}#service`,
    name: locale === "ja" ? service.name_ja : service.name_en,
    description: locale === "ja" ? service.summary_ja : service.summary_en,
    serviceType: locale === "ja" ? service.service_type_ja : service.service_type_en,
    url: canonical,
    provider: { "@id": SITE.organizationId },
    areaServed: "JP",
  };
}

export function faqNode(canonical: string, faqs: Faq[], locale: Locale): Node {
  return {
    "@type": "FAQPage",
    "@id": `${canonical}#faq`,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: locale === "ja" ? faq.question_ja : faq.question_en,
      acceptedAnswer: {
        "@type": "Answer",
        text: locale === "ja" ? faq.answer_ja : faq.answer_en,
      },
    })),
  };
}

export function articleNode(options: {
  canonical: string;
  locale: Locale;
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  authorId: string;
}): Node {
  const node: Node = {
    "@type": "NewsArticle",
    "@id": `${options.canonical}#article`,
    mainEntityOfPage: { "@id": `${options.canonical}#webpage` },
    headline: options.headline,
    description: options.description,
    datePublished: options.datePublished,
    dateModified: options.dateModified ?? options.datePublished,
    inLanguage: options.locale,
    author: { "@id": options.authorId },
    publisher: { "@id": SITE.organizationId },
  };
  if (options.image) node.image = [options.image];
  return node;
}

export function graph(nodes: Node[]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": nodes,
  }).replace(/</g, "\\u003c");
}

export function insightArticle(insight: Insight, locale: Locale, canonical: string, image?: string): Node {
  const headline = locale === "ja" ? insight.title_ja : insight.title_en;
  const description = locale === "ja" ? insight.seo_ja.seo_description : insight.seo_en.seo_description;
  return articleNode({
    canonical,
    locale,
    headline,
    description,
    datePublished: insight.published_at,
    image,
    authorId: SITE.editorialId,
  });
}

export function noticeArticle(notice: Notice, locale: Locale, canonical: string): Node {
  const headline = locale === "ja" ? notice.title_ja : notice.title_en || notice.title_ja;
  const description = locale === "ja" ? notice.seo_ja.seo_description : notice.seo_en?.seo_description || notice.seo_ja.seo_description;
  return articleNode({
    canonical,
    locale,
    headline,
    description,
    datePublished: notice.date,
    authorId: SITE.organizationId,
  });
}
