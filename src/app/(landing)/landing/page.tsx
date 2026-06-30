import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { PhilosophyBand } from "@/components/landing/StatsBanner";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { CtaSection, LandingFooter } from "@/components/landing/CtaFooter";

export default function LandingPage() {
  return (
    <div className="bg-warm-50 min-h-screen">
      <LandingNav />
      <HeroSection />
      <PhilosophyBand />
      <FeaturesGrid />
      <WorkflowSection />
      <DashboardPreview />
      <CtaSection />
      <LandingFooter />
    </div>
  );
}
