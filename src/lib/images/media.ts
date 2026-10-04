import { mediaHost } from "../microcms/client";

export function isRemoteMedia(src: string | undefined): src is string {
  if (!src) return false;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname === mediaHost();
  } catch {
    return false;
  }
}

export function absoluteAsset(src: string, site: URL | undefined): string {
  if (src.startsWith("https://")) return src;
  const origin = site?.origin ?? "https://neolev.jp";
  return new URL(src, origin).href;
}
