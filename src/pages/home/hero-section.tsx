import { ArrowDown, ArrowRight } from "lucide-react";
import { ActionButton } from "@/components/button/action-button";
import { HOME_MESSAGES } from "@/text/home/home-messages";

export function HeroSection() {
  return (
    <section className="hero">
      <div className="wrap">
        <div className="hero-content">
          <div className="eyebrow">{HOME_MESSAGES.HERO.EYEBROW}</div>
          <h1>
            {HOME_MESSAGES.HERO.TITLE_START}
            <br />
            <em>{HOME_MESSAGES.HERO.TITLE_ACCENT}</em>
          </h1>
          <p className="hero-copy">
            {HOME_MESSAGES.HERO.DESCRIPTION}
          </p>
          <div className="button-row">
            <ActionButton href="#contact" variant="primary" icon={<ArrowRight size={16} />}>
              {HOME_MESSAGES.HERO.PRIMARY_ACTION}
            </ActionButton>
            <ActionButton href="#products" variant="outline">
              {HOME_MESSAGES.HERO.SECONDARY_ACTION}
            </ActionButton>
          </div>
          <a className="hero-note" href="#solutions">
            <ArrowDown size={14} /> {HOME_MESSAGES.HERO.MORE_ACTION}
          </a>
        </div>
      </div>
    </section>
  );
}
