import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import { ActionButton } from "@/components/button/action-button";
import { SectionHeading } from "@/components/heading/section-heading";
import { HOME_MESSAGES } from "@/text/home/home-messages";
import coffeeMachineImage from "@/assets/coffee-machine-float.png";

export function ProductSection() {
  return (
    <section id="solutions" className="section product-section">
      <div className="wrap product-grid">
        <div className="product-image">
          <Image
            src={coffeeMachineImage}
            alt={HOME_MESSAGES.PRODUCT.IMAGE_ALT}
            width={760}
            height={760}
          />
          <span className="product-label">{HOME_MESSAGES.PRODUCT.IMAGE_LABEL}</span>
        </div>

        <div id="products" className="product-copy">
          <SectionHeading
            eyebrow={HOME_MESSAGES.PRODUCT.EYEBROW}
            title={HOME_MESSAGES.PRODUCT.TITLE}
            description={HOME_MESSAGES.PRODUCT.DESCRIPTION}
          />
          <h3>{HOME_MESSAGES.PRODUCT.SUBTITLE}</h3>
          <p>{HOME_MESSAGES.PRODUCT.DETAIL}</p>
          <ul className="benefit-list">
            {HOME_MESSAGES.PRODUCT.BENEFITS.map((benefit) => (
              <li key={benefit}>
                <span className="check-mark"><Check size={13} /></span>
                {benefit}
              </li>
            ))}
          </ul>
          <ActionButton href="#technology" variant="text" icon={<ArrowRight size={15} />}>
            {HOME_MESSAGES.PRODUCT.ACTION}
          </ActionButton>
        </div>
      </div>
    </section>
  );
}
