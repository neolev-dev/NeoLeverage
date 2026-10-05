import type { APIRoute } from "astro";
import { getContent } from "../lib/microcms/client";
import { SITE } from "../lib/site";

const SEARCH_AGENTS = ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User", "Claude-SearchBot"];
const TRAINING_AGENTS = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot", "Bytespider", "Amazonbot", "Meta-ExternalAgent"];

export const GET: APIRoute = async () => {
  const content = await getContent();
  const policy = content.settings.ai_crawler_policy;
  const lines = ["User-agent: *", "Allow: /", ""];

  for (const agent of [...SEARCH_AGENTS, ...TRAINING_AGENTS]) {
    const isSearch = SEARCH_AGENTS.includes(agent);
    const allow = policy === "allow" || (policy === "search_only" && isSearch);
    lines.push(`User-agent: ${agent}`, allow ? "Allow: /" : "Disallow: /", "");
  }

  lines.push(`Sitemap: ${SITE.origin}/sitemap.xml`, "");
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
