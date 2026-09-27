import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/QueryProvider";
import { Providers } from "./providers";
import type { ReactNode } from "react";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "DOLORES COFFEE — Coffee Machine as a Service",
  description: "Giải pháp thuê máy pha cà phê tích hợp IoT & Cloud hàng đầu Việt Nam. Quản lý toàn bộ đội máy từ một nền tảng duy nhất.",
  keywords: "thuê máy pha cà phê, IoT, cloud, dashboard, DOLORES COFFEE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="vi" className="scroll-smooth">
      <body className={`${inter.variable} ${playfair.variable} font-sans bg-white text-[#18191F] antialiased`}>
        <Providers>
          <QueryProvider>
            {children}
          </QueryProvider>
        </Providers>
      </body>
    </html>
  );
}
