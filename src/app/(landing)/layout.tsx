import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SCM-BEANS — Precision IoT Espresso Fleet Management",
  description:
    "Monitor, control, and optimise your commercial espresso machine fleet in real time. Precision extraction meets industrial-grade IoT telemetry.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
