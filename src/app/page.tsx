import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { CtaSection, LandingFooter } from "@/components/landing/CtaFooter";

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <HeroSection />
      <FeaturesGrid />
      <DashboardPreview />
      <WorkflowSection />
      <CtaSection />
      <LandingFooter />
    </>
  );
}
