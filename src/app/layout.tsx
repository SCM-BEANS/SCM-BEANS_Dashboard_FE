import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const ubarHeadline = localFont({
  src: "./fonts/UBar-Headline.otf",
  weight: "700",
  style: "normal",
  display: "swap",
  variable: "--font-ubar-headline",
});

export const metadata: Metadata = {
  title: "Dolores · Quản lý máy pha cà phê Smart IoT",
  description: "Bản Next.js local chuyển thể từ prototype Dolores trên Figma.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={ubarHeadline.variable}>
      <body>{children}</body>
    </html>
  );
}
