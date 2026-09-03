import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["600", "700", "800"], display: "swap" });
const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#fdf8ec",
};

export const metadata: Metadata = {
  title: "VIBE FOUR — Connect Four",
  description: "A refined, retro-inspired Connect Four. Share a 4-letter code and play on any device.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${space.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#fdf8ec] text-[#1e150e] selection:bg-[#dc2626]/15">
        {/* retro paper + subtle warm radial */}
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-[#fdf8ec]" />
          <div className="absolute inset-0 opacity-[0.55]" style={{ background: "radial-gradient(900px 600px at 20% 0%, #f5ead1 0%, transparent 60%), radial-gradient(700px 500px at 95% 10%, #f0dfb8 0%, transparent 55%), radial-gradient(800px 600px at 50% 100%, #efe2c3 0%, transparent 65%)" }} />
          {/* thin top hairline */}
          <div className="absolute top-0 inset-x-0 h-px bg-[#1e150e]/10" />
        </div>
        {children}
      </body>
    </html>
  );
}
