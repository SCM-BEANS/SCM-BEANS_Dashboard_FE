import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { ClientLogos } from "@/components/landing/ClientLogos";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { InnovationSection } from "@/components/landing/InnovationSection";
import { DistributionSection } from "@/components/landing/DistributionSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { NewsSection } from "@/components/landing/NewsSection";
import { CtaSection, LandingFooter } from "@/components/landing/CtaFooter";

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <HeroSection />
      <ClientLogos />
      <ProductShowcase />
      <InnovationSection />
      <DistributionSection />
      <TestimonialsSection />
      <NewsSection />
      <CtaSection />
      <LandingFooter />
    </>
  );
}
