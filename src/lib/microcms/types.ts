import type { Locale } from "../i18n/locale";

export type SeoFields = {
  seo_title?: string;
  seo_description: string;
  og_title?: string;
  og_description?: string;
  og_image_alt?: string;
  canonical_url?: string;
  noindex?: boolean;
  exclude_from_sitemap?: boolean;
  breadcrumb_label?: string;
};

export type AioFields = {
  summary: string;
  key_points?: string[];
  target_audience?: string;
};

export type Office = {
  id: string;
  name: string;
  name_en: string;
  postal_code: string;
  address_region: string;
  address_locality: string;
  street_address: string;
  address_en: string;
  is_headquarters: boolean;
  order: number;
};

export type SiteSettings = {
  legal_name_ja: string;
  legal_name_en: string;
  name_kana: string;
  alternate_names: string[];
  site_name: string;
  site_alternate_names: string[];
  founding_date: string;
  editorial_name_ja: string;
  editorial_name_en: string;
  editorial_description_ja: string;
  editorial_description_en: string;
  tagline_ja: string;
  tagline_en: string;
  description_ja: string;
  description_en: string;
  knows_about_ja: string[];
  knows_about_en: string[];
  area_served: string[];
  quote_policy_ja: string;
  quote_policy_en: string;
  corporate_number: string;
  same_as: string[];
  business_summary_ja: string[];
  business_summary_en: string[];
  llms_intro_ja: string;
  llms_intro_en: string;
  ai_crawler_policy: "allow" | "search_only" | "deny";
  offices: Office[];
};

export type NamedItem = { name: string; description: string };

export type ServiceArea = {
  id: string;
  slug: "creative" | "marketing" | "ai";
  anchor: "cr" | "ma" | "ai";
  order: number;
  name_ja: string;
  name_en: string;
  catch_ja: string;
  catch_en: string;
  lead_ja: string;
  lead_en: string;
  capabilities_ja: string[];
  capabilities_en: string[];
  seo_ja: SeoFields;
  seo_en: SeoFields;
  aio_ja: AioFields;
  aio_en: AioFields;
};

export type Service = {
  id: string;
  slug: string;
  area: ServiceArea["slug"];
  order: number;
  is_focus: boolean;
  name_ja: string;
  name_en: string;
  catch_ja: string;
  catch_en: string;
  tailwind_benefit_ja: string;
  tailwind_benefit_en: string;
  summary_ja: string;
  summary_en: string;
  audience_ja: string[];
  audience_en: string[];
  problems_ja: string[];
  problems_en: string[];
  solution_ja: string;
  solution_en: string;
  deliverables_ja: NamedItem[];
  deliverables_en: NamedItem[];
  process_ja: NamedItem[];
  process_en: NamedItem[];
  timeline_note_ja: string;
  timeline_note_en: string;
  service_type_ja: string;
  service_type_en: string;
  related_slugs: string[];
  prototype_copy: boolean;
  seo_ja: SeoFields;
  seo_en: SeoFields;
  aio_ja: AioFields;
  aio_en: AioFields;
};

export type Faq = {
  id: string;
  scope: Array<"general" | "service">;
  services: string[];
  order: number;
  question_ja: string;
  question_en: string;
  answer_ja: string;
  answer_en: string;
};

export type Notice = {
  id: string;
  slug: string;
  date: string;
  title_ja: string;
  title_en?: string;
  body_ja: string[];
  body_en?: string[];
  seo_ja: SeoFields;
  seo_en?: SeoFields;
};

export type Category = {
  id: string;
  slug: string;
  name_ja: string;
  name_en: string;
  description_ja: string;
  description_en: string;
};

export type Tag = {
  id: string;
  slug: string;
  name_ja: string;
  name_en: string;
};

export type Insight = {
  id: string;
  slug: string;
  published_at: string;
  category: string;
  tags: string[];
  title_ja: string;
  title_en: string;
  lead_ja: string;
  lead_en?: string;
  eyecatch_url?: string;
  eyecatch_alt_ja: string;
  eyecatch_alt_en: string;
  eyecatch_width?: number;
  eyecatch_height?: number;
  body_pending: boolean;
  seo_ja: SeoFields;
  seo_en: SeoFields;
  aio_ja: AioFields;
  aio_en?: AioFields;
};

export type StaticPage = {
  id: string;
  slug: string;
  title_ja: string;
  title_en: string;
  revised_note_ja?: string;
  revised_note_en?: string;
  sections_ja: { heading: string; paragraphs: string[] }[];
  sections_en: { heading: string; paragraphs: string[] }[];
  seo_ja: SeoFields;
  seo_en: SeoFields;
};

export type ToolRow = {
  group: "works" | "prototypes";
  label_ja: string;
  label_en: string;
  items: string;
};

export type ContentBundle = {
  settings: SiteSettings;
  areas: ServiceArea[];
  services: Service[];
  faqs: Faq[];
  notices: Notice[];
  categories: Category[];
  tags: Tag[];
  insights: Insight[];
  pages: StaticPage[];
  tools: ToolRow[];
  source: "microcms" | "mock";
};

export type LocalizedSeo = {
  locale: Locale;
  title: string;
  description: string;
};
