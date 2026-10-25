import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SF Bay Tidelog & Personal Journal",
    short_name: "SF Tidelog",
    description: "Daily maritime tides, solar-lunar cycles, and journal for San Francisco Bay.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F4EE",
    theme_color: "#F4EFE6",
    icons: [
      {
        src: "/globe.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
