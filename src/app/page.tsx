"use client";

import { useState } from "react";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { InnovationSection } from "@/components/landing/InnovationSection";
import { DistributionSection } from "@/components/landing/DistributionSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { NewsSection } from "@/components/landing/NewsSection";
import { CtaSection, LandingFooter } from "@/components/landing/CtaFooter";

export default function LandingPage() {
  const [videoEnded, setVideoEnded] = useState(false);

  return (
    <>
      <LandingNav videoEnded={videoEnded} isLandingHero />
      <HeroSection videoEnded={videoEnded} onVideoEnded={() => setVideoEnded(true)} />
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
