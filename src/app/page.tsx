import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { InnovationSection } from "@/components/landing/InnovationSection";
import { DistributionSection } from "@/components/landing/DistributionSection";
import { NewsSection } from "@/components/landing/NewsSection";
import { CtaSection, LandingFooter } from "@/components/landing/CtaFooter";

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <HeroSection />
      <ProductShowcase />
      <InnovationSection />
      <DistributionSection />
      <NewsSection />
      <CtaSection />
      <LandingFooter />
    </>
  );
}
