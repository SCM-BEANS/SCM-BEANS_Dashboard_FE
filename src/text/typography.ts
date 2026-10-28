export const TYPOGRAPHY = {
  FONT_FAMILY: {
    BODY: "Arial, Helvetica, sans-serif",
    DISPLAY: "Arial, Helvetica, sans-serif",
  },
  FONT_SIZE: {
    BRAND: "15px",
    BRAND_TAGLINE: "9px",
    CAPTION: "10px",
    LABEL: "11px",
    SMALL: "12px",
    CONTROL: "13px",
    BODY_SMALL: "14px",
    BODY: "15px",
    BODY_LARGE: "16px",
    CARD_TITLE: "17px",
    METRIC: "32px",
    PRODUCT_TITLE: "34px",
    HERO_TITLE: "clamp(44px, 6.5vw, 78px)",
    SECTION_TITLE: "clamp(34px, 4.5vw, 54px)",
    CTA_TITLE: "clamp(34px, 5vw, 54px)",
  },
} as const;

export const TYPOGRAPHY_STYLES = `
  :root {
    --font-family-body: ${TYPOGRAPHY.FONT_FAMILY.BODY};
    --font-family-display: ${TYPOGRAPHY.FONT_FAMILY.DISPLAY};
    --font-size-brand: ${TYPOGRAPHY.FONT_SIZE.BRAND};
    --font-size-brand-tagline: ${TYPOGRAPHY.FONT_SIZE.BRAND_TAGLINE};
    --font-size-caption: ${TYPOGRAPHY.FONT_SIZE.CAPTION};
    --font-size-label: ${TYPOGRAPHY.FONT_SIZE.LABEL};
    --font-size-small: ${TYPOGRAPHY.FONT_SIZE.SMALL};
    --font-size-control: ${TYPOGRAPHY.FONT_SIZE.CONTROL};
    --font-size-body-small: ${TYPOGRAPHY.FONT_SIZE.BODY_SMALL};
    --font-size-body: ${TYPOGRAPHY.FONT_SIZE.BODY};
    --font-size-body-large: ${TYPOGRAPHY.FONT_SIZE.BODY_LARGE};
    --font-size-card-title: ${TYPOGRAPHY.FONT_SIZE.CARD_TITLE};
    --font-size-metric: ${TYPOGRAPHY.FONT_SIZE.METRIC};
    --font-size-product-title: ${TYPOGRAPHY.FONT_SIZE.PRODUCT_TITLE};
    --font-size-hero-title: ${TYPOGRAPHY.FONT_SIZE.HERO_TITLE};
    --font-size-section-title: ${TYPOGRAPHY.FONT_SIZE.SECTION_TITLE};
    --font-size-cta-title: ${TYPOGRAPHY.FONT_SIZE.CTA_TITLE};
  }
`;
