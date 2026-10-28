import Image from "next/image";
import { ActionButton } from "@/components/button/action-button";
import { PATH_HOME } from "@/routes/path";
import { HOME_MESSAGES } from "@/text/home/home-messages";
import coffeeMachineImage from "@/assets/coffee-machine-float.png";

export function HeroSection() {
  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div className="hero-content">
          <h1>
            <span>{HOME_MESSAGES.HERO.TITLE_START}</span>
            {" "}
            <span>{HOME_MESSAGES.HERO.TITLE_ACCENT}</span>
          </h1>
          <p className="hero-copy">{HOME_MESSAGES.HERO.DESCRIPTION}</p>
          <div className="button-row">
            <ActionButton href={PATH_HOME.SECTIONS.SOLUTIONS} variant="primary">
              {HOME_MESSAGES.HERO.PRIMARY_ACTION}
            </ActionButton>
            <ActionButton href={PATH_HOME.SECTIONS.TECHNOLOGY} variant="secondary">
              {HOME_MESSAGES.HERO.SECONDARY_ACTION}
            </ActionButton>
          </div>
        </div>

        <div className="hero-product-image">
          <Image
            src={coffeeMachineImage}
            alt={HOME_MESSAGES.PRODUCT.IMAGE_ALT}
            width={760}
            height={760}
            priority
            sizes="(max-width: 700px) 92vw, (max-width: 1023px) 82vw, 52vw"
          />
        </div>
      </div>
    </section>
  );
}
