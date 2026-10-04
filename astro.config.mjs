import { defineConfig } from "astro/config";

const mediaHost = process.env.MEDIA_HOST || "pub-dbe0635cce4240dda8b7b3874f631e3f.r2.dev";

export default defineConfig({
  site: "https://neolev.jp",
  output: "static",
  trailingSlash: "ignore",
  build: {
    format: "directory",
  },
  image: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: mediaHost,
      },
    ],
  },
  vite: {
    envPrefix: ["PUBLIC_"],
  },
});
