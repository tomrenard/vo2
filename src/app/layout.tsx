import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Newsreader } from "next/font/google";
import { IPHONES } from "@/lib/iphones";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "vo2",
  description: "The science of endurance, one question at a time.",
  appleWebApp: {
    capable: true,
    title: "vo2",
    statusBarStyle: "default",
    startupImage: IPHONES.map(([w, h, r]) => ({
      url: `/splash/${w * r}x${h * r}`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
    })),
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#121315" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
