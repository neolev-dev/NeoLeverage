import { mockBundle } from "./mock";
import type { ContentBundle, Insight, Notice, Service, ServiceArea, StaticPage } from "./types";

type ListResponse<T> = { contents: T[]; totalCount?: number };

function env(name: string): string {
  const fromImport = (import.meta.env as Record<string, string | undefined>)[name];
  if (fromImport) return fromImport;
  if (typeof process !== "undefined" && process.env?.[name]) return process.env[name] ?? "";
  return "";
}

export function mediaHost(): string {
  return env("MEDIA_HOST") || "pub-dbe0635cce4240dda8b7b3874f631e3f.r2.dev";
}

export function usingMockContent(): boolean {
  return !env("MICROCMS_SERVICE_DOMAIN") || !env("MICROCMS_API_KEY");
}

async function cmsList<T>(endpoint: string): Promise<T[] | null> {
  const domain = env("MICROCMS_SERVICE_DOMAIN");
  const key = env("MICROCMS_API_KEY");
  if (!domain || !key) return null;

  const contents: T[] = [];
  let offset = 0;
  const limit = 100;
  try {
    for (;;) {
      const url = `https://${domain}.microcms.io/api/v1/${endpoint}?limit=${limit}&offset=${offset}`;
      const response = await fetch(url, { headers: { "X-MICROCMS-API-KEY": key } });
      if (!response.ok) {
        console.warn(`[microcms] ${endpoint} returned ${response.status}. Using mock content.`);
        return null;
      }
      const data = (await response.json()) as ListResponse<T>;
      contents.push(...data.contents);
      if (contents.length >= (data.totalCount ?? contents.length) || data.contents.length < limit) break;
      offset += limit;
    }
    return contents;
  } catch (error) {
    console.warn(`[microcms] ${endpoint} failed. Using mock content.`, error);
    return null;
  }
}

async function cmsObject<T>(endpoint: string): Promise<T | null> {
  const domain = env("MICROCMS_SERVICE_DOMAIN");
  const key = env("MICROCMS_API_KEY");
  if (!domain || !key) return null;
  try {
    const response = await fetch(`https://${domain}.microcms.io/api/v1/${endpoint}`, {
      headers: { "X-MICROCMS-API-KEY": key },
    });
    if (!response.ok) {
      console.warn(`[microcms] ${endpoint} returned ${response.status}. Using mock content.`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.warn(`[microcms] ${endpoint} failed. Using mock content.`, error);
    return null;
  }
}

let bundlePromise: Promise<ContentBundle> | null = null;

export function getContent(): Promise<ContentBundle> {
  if (!bundlePromise) bundlePromise = load();
  return bundlePromise;
}

async function load(): Promise<ContentBundle> {
  if (usingMockContent()) return mockBundle;

  const [settings, areas, services, faqs, notices, categories, tags, insights, pages] = await Promise.all([
    cmsObject<ContentBundle["settings"]>("site_settings"),
    cmsList<ServiceArea>("service_areas"),
    cmsList<Service>("services"),
    cmsList<ContentBundle["faqs"][number]>("faqs"),
    cmsList<Notice>("notices"),
    cmsList<ContentBundle["categories"][number]>("insight_categories"),
    cmsList<ContentBundle["tags"][number]>("tags"),
    cmsList<Insight>("insights"),
    cmsList<StaticPage>("pages"),
  ]);

  if (!settings || !areas || !services || !faqs || !notices || !categories || !tags || !insights || !pages) {
    return mockBundle;
  }

  return {
    source: "microcms",
    settings,
    areas,
    services,
    faqs,
    notices,
    categories,
    tags,
    insights,
    pages,
    tools: mockBundle.tools,
  };
}

export async function getAreas(): Promise<ServiceArea[]> {
  const content = await getContent();
  return [...content.areas].sort((a, b) => a.order - b.order);
}

export async function getServices(): Promise<Service[]> {
  const content = await getContent();
  return [...content.services].sort((a, b) => a.order - b.order);
}

export async function getService(slug: string): Promise<Service | ServiceArea | undefined> {
  const content = await getContent();
  return content.services.find((item) => item.slug === slug) ?? content.areas.find((item) => item.slug === slug);
}

export function isArea(entry: Service | ServiceArea): entry is ServiceArea {
  return "anchor" in entry;
}
