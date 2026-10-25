import type { Metadata, Viewport } from "next";
import { Cinzel, EB_Garamond, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#F4EFE6",
};

export const metadata: Metadata = {
  title: "San Francisco Bay Tidelog & Personal Journal",
  description:
    "Daily nautical almanac, tidal predictions, solar-lunar cycles, and reflective goal tracking for San Francisco Bay.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SF Tidelog",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${ebGaramond.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F7F4EE] text-[#142334] font-serif selection:bg-[#E3D9C6] selection:text-[#0C1724]">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
