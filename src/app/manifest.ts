import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "vo2",
    short_name: "vo2",
    description: "The science of endurance, one question at a time.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5f0",
    theme_color: "#7d2415",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
