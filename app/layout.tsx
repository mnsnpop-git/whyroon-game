import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "เกมร่าเริง - ปาร์ตี้เกม",
  applicationName: "เกมร่าเริง - ปาร์ตี้เกม",
  description: "รวมปาร์ตี้เกมเล่นกับเพื่อนแบบเรียลไทม์ — Doraemon, ใบ้คำแข่งเวลา, Werewolf",
};

export const viewport: Viewport = {
  themeColor: "#090D16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${kanit.variable} h-full antialiased`}>
      <body className="ambient-bg min-h-dvh">{children}</body>
    </html>
  );
}
