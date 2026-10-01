import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Kutana",
    short_name: "Kutana",
    description: "Verified dating for adults. Kenya first, then Africa.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone"],
    orientation: "portrait",
    background_color: "#070708",
    theme_color: "#070708",
    lang: "en-KE",
    categories: ["lifestyle", "social"],
    icons: [
      {
        src: "/icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Discover", short_name: "Discover", url: "/discover" },
      { name: "Browse", short_name: "Browse", url: "/browse" },
    ],
  };
}
