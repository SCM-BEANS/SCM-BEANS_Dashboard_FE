import type { Metadata } from "next";
import { Hanken_Grotesk, Playfair_Display } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/QueryProvider";
import { Providers } from "./providers";

const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "DEER_01 - Precision Brew Dashboard",
  description: "Zenith Brew - IoT Espresso Machine Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${hanken.variable} ${playfair.variable} font-sans bg-surface text-on-surface`}>
        <Providers>
          <QueryProvider>
            {children}
          </QueryProvider>
        </Providers>
      </body>
    </html>
  );
}
