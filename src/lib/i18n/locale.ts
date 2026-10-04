export type Locale = "ja" | "en";

export const LOCALES: Locale[] = ["ja", "en"];

export function otherLocale(locale: Locale): Locale {
  return locale === "ja" ? "en" : "ja";
}

export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === "ja") return clean;
  if (clean === "/") return "/en/";
  return `/en${clean}`;
}

export function absoluteUrl(path: string): string {
  const base = "https://neolev.jp";
  if (path === "/") return `${base}/`;
  if (path === "/en" || path === "/en/") return `${base}/en/`;
  return `${base}${path.replace(/\/$/, "")}`;
}

export function field<T>(entry: T, name: string, locale: Locale): string {
  const value = (entry as Record<string, unknown>)[`${name}_${locale}`];
  return typeof value === "string" ? value : "";
}

export function fieldList<T>(entry: T, name: string, locale: Locale): string[] {
  const value = (entry as Record<string, unknown>)[`${name}_${locale}`];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function hasEnglish(entry: { seo_en?: { seo_description?: string }; title_en?: string; name_en?: string }): boolean {
  return Boolean(entry.seo_en?.seo_description && (entry.title_en || entry.name_en || entry.seo_en.seo_description));
}
