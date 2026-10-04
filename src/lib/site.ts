export const SITE = {
  origin: "https://neolev.jp",
  name: "NeoLeverage",
  legalNameJa: "NeoLeverage株式会社",
  legalNameEn: "NeoLeverage Inc.",
  kana: "ネオレバレッジ",
  foundingDate: "2025-10-06",
  corporateNumber: "1290001111832",
  editorialJa: "NeoLeverage編集部",
  editorialEn: "NeoLeverage Editorial Team",
  editorialId: "https://neolev.jp/#editorial",
  organizationId: "https://neolev.jp/#organization",
  websiteId: "https://neolev.jp/#website",
  logoId: "https://neolev.jp/#logo",
  logoPath: "/logo.png",
  defaultOgPath: "/og-default.png",
  gtmPattern: /^GTM-[A-Z0-9]+$/,
} as const;

export function gtmId(): string | null {
  const value = import.meta.env.PUBLIC_GTM_CONTAINER_ID?.trim() ?? "";
  return SITE.gtmPattern.test(value) ? value : null;
}

export function turnstileSiteKey(): string | null {
  const value = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  return value.length > 0 ? value : null;
}
