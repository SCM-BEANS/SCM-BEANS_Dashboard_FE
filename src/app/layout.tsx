import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

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
      <body className={`${hanken.variable} ${jetbrains.variable} font-sans`}>
        <div className="flex min-h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 relative w-full md:pl-64">
            <Header />
            <main className="flex-1 overflow-y-auto p-4 md:p-10">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
