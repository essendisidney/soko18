import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SOKO18",
    short_name: "SOKO18",
    description: "Discover. Connect. Verify. Nairobi local discovery.",
    start_url: "/discover",
    display: "standalone",
    background_color: "#070708",
    theme_color: "#070708",
    lang: "en-KE",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
