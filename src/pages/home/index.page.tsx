import Head from "next/head";
import Link from "next/link";
import { ActionButton } from "@/components/button/action-button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SectionHeading } from "@/components/heading/section-heading";
import { HOME_SECTION_IDS, PATH_AUTH } from "@/routes/path";
import {
  HOME_FOOTER_DISCOVERY_LINKS,
  HOME_FOOTER_PRODUCT_LINKS,
} from "@/routes/routes";
import { HOME_MESSAGES } from "@/text/home/home-messages";
import { LandingOpening } from "./landing-opening";
import { HomeHeader } from "./home-header";
import { ProductSection } from "./product-section";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>{HOME_MESSAGES.PAGE.TITLE}</title>
        <meta name="description" content={HOME_MESSAGES.PAGE.DESCRIPTION} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.root}>
        <HomeHeader />

        <main id={HOME_SECTION_IDS.TOP}>
          <LandingOpening />
          <ProductSection />

          <section id={HOME_SECTION_IDS.TECHNOLOGY} className="section technology-section">
            <div className="wrap technology-grid">
              <SectionHeading
                title={HOME_MESSAGES.TECHNOLOGY.TITLE}
                description={HOME_MESSAGES.TECHNOLOGY.DESCRIPTION}
              />
              <ul className="platform-list">
                {HOME_MESSAGES.TECHNOLOGY.POINTS.map((point) => (
                  <li key={point.TITLE}>
                    <strong>{point.TITLE}</strong>
                    <span>{point.DESCRIPTION}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section id={HOME_SECTION_IDS.ABOUT} className="section services-section">
            <div className="wrap">
              <SectionHeading
                title={HOME_MESSAGES.SERVICES.TITLE}
                description={HOME_MESSAGES.SERVICES.DESCRIPTION}
              />
              <ol className="service-list">
                {HOME_MESSAGES.SERVICES.POINTS.map((service, index) => (
                  <li key={service.TITLE}>
                    <span className="service-number" aria-hidden="true">0{index + 1}</span>
                    <div>
                      <h3>{service.TITLE}</h3>
                      <p>{service.DESCRIPTION}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section id={HOME_SECTION_IDS.CONTACT} className="contact-section">
            <div className="wrap">
              <div className="contact-panel">
                <div className="contact-copy">
                  <h2>{HOME_MESSAGES.CONTACT.TITLE}</h2>
                  <p>{HOME_MESSAGES.CONTACT.DESCRIPTION}</p>
                </div>
                <div className="button-row">
                  <ActionButton href={`mailto:${HOME_MESSAGES.CONTACT.EMAIL}`} variant="primary">
                    {HOME_MESSAGES.CONTACT.CONSULT_ACTION}
                  </ActionButton>
                  <ActionButton href={PATH_AUTH.LOGIN} variant="secondary">
                    {HOME_MESSAGES.CONTACT.DASHBOARD_ACTION}
                  </ActionButton>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="footer">
          <div className="wrap">
            <div className="footer-grid">
              <div>
                <BrandLogo
                  ariaLabel={HOME_MESSAGES.BRAND.ARIA_LABEL}
                />
                <p className="footer-description">{HOME_MESSAGES.FOOTER.DESCRIPTION}</p>
              </div>
              <div>
                <h3>{HOME_MESSAGES.FOOTER.PRODUCT_TITLE}</h3>
                <div className="footer-links">
                  {HOME_FOOTER_PRODUCT_LINKS.map((item) => (
                    <Link key={item.HREF} href={item.HREF}>{item.LABEL}</Link>
                  ))}
                </div>
              </div>
              <div>
                <h3>{HOME_MESSAGES.FOOTER.DISCOVERY_TITLE}</h3>
                <div className="footer-links">
                  {HOME_FOOTER_DISCOVERY_LINKS.map((item) => (
                    <Link key={item.HREF} href={item.HREF}>{item.LABEL}</Link>
                  ))}
                </div>
              </div>
              <div>
                <h3>{HOME_MESSAGES.FOOTER.CONTACT_TITLE}</h3>
                <div className="footer-links">
                  <a href={`mailto:${HOME_MESSAGES.CONTACT.EMAIL}`}>{HOME_MESSAGES.CONTACT.EMAIL}</a>
                  <a href={HOME_MESSAGES.FOOTER.PHONE_HREF}>{HOME_MESSAGES.FOOTER.PHONE}</a>
                  <span>{HOME_MESSAGES.FOOTER.ADDRESS}</span>
                </div>
              </div>
            </div>
            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} {HOME_MESSAGES.FOOTER.COPYRIGHT}</span>
              <span>{HOME_MESSAGES.FOOTER.AUDIENCE}</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
