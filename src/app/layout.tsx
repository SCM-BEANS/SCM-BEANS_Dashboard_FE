import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" });

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
      <body className={`${hanken.variable} font-sans bg-surface text-on-surface`}>
        {children}
      </body>
    </html>
  );
}
