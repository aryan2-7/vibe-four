import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fredoka, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], weight: ["600", "700"] });
const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a12",
};

export const metadata: Metadata = {
  title: "VIBE FOUR — Connect 4 Reimagined",
  description: "Mobile-first Connect 4 with code pairing. Create a room, share the code, play instantly. Pass & play on one phone too.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} ${space.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0a0a12] text-white selection:bg-fuchsia-500/30">
        {/* ambient background */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[#0a0a12]" />
          <div className="absolute -top-[30%] -right-[20%] w-[80%] h-[60%] rounded-full bg-gradient-to-br from-violet-600/30 via-fuchsia-500/20 to-indigo-500/20 blur-[80px]" />
          <div className="absolute -bottom-[30%] -left-[20%] w-[80%] h-[60%] rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-500/15 to-violet-500/20 blur-[80px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[40%] bg-gradient-to-r from-transparent via-white/[0.02] to-transparent rotate-12" />
        </div>
        {children}
      </body>
    </html>
  );
}
