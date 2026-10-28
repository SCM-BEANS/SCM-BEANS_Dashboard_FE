import { Check } from "lucide-react";
import { SectionHeading } from "@/components/heading/section-heading";
import { HOME_SECTION_IDS } from "@/routes/path";
import { HOME_MESSAGES } from "@/text/home/home-messages";

export function ProductSection() {
  return (
    <section id={HOME_SECTION_IDS.SOLUTIONS} className="section product-section">
      <div className="wrap product-grid">
        <div id={HOME_SECTION_IDS.PRODUCTS} className="product-copy">
          <SectionHeading
            title={HOME_MESSAGES.PRODUCT.TITLE}
            description={HOME_MESSAGES.PRODUCT.DESCRIPTION}
          />
        </div>

        <ul className="benefit-list">
          {HOME_MESSAGES.PRODUCT.BENEFITS.map((benefit) => (
            <li key={benefit}>
              <span className="check-mark" aria-hidden="true"><Check size={16} /></span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
