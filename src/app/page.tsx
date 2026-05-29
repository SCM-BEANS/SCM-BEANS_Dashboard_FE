import dynamic from "next/dynamic";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import type { Metadata } from "next";

// Below-fold sections loaded lazily — reduces initial JS bundle sent to browser
// HeroSection + LandingNav are above-fold so they stay as static imports
const FeaturesGrid    = dynamic(() => import("@/components/landing/FeaturesGrid").then((m) => ({ default: m.FeaturesGrid })));
const DashboardPreview = dynamic(() => import("@/components/landing/DashboardPreview").then((m) => ({ default: m.DashboardPreview })));
const WorkflowSection  = dynamic(() => import("@/components/landing/WorkflowSection").then((m) => ({ default: m.WorkflowSection })));
const CtaSection       = dynamic(() => import("@/components/landing/CtaFooter").then((m) => ({ default: m.CtaSection })));
const LandingFooter    = dynamic(() => import("@/components/landing/CtaFooter").then((m) => ({ default: m.LandingFooter })));

export const metadata: Metadata = {
  title: "Deer Coffee IoT — Cloud Integration for Existing Coffee Fleets",
  description:
    "Retrofit any espresso machine with plug-and-play hardware. Monitor, configure, and maintain your entire fleet from a single cloud dashboard. No replacement required.",
};

export default function LandingPage() {
  return (
    <main className="bg-white text-[#111] min-h-screen overflow-x-hidden">
      <LandingNav />
      <HeroSection />
      <FeaturesGrid />
      <DashboardPreview />
      <WorkflowSection />
      <CtaSection />
      <LandingFooter />
    </main>
  );
}
