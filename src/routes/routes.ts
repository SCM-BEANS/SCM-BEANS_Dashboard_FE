export const HOME_SECTION_IDS = {
  TOP: "top",
  SOLUTIONS: "solutions",
  PRODUCTS: "products",
  TECHNOLOGY: "technology",
  ABOUT: "about",
  CUSTOMERS: "customers",
  NEWS: "news",
  CONTACT: "contact",
} as const;

export const ROUTES = {
  HOME: "/",
  HOME_ALIAS: "/home",
  LOGIN: "/login",
  HOME_SECTIONS: {
    TOP: `#${HOME_SECTION_IDS.TOP}`,
    SOLUTIONS: `#${HOME_SECTION_IDS.SOLUTIONS}`,
    PRODUCTS: `#${HOME_SECTION_IDS.PRODUCTS}`,
    TECHNOLOGY: `#${HOME_SECTION_IDS.TECHNOLOGY}`,
    ABOUT: `#${HOME_SECTION_IDS.ABOUT}`,
    CUSTOMERS: `#${HOME_SECTION_IDS.CUSTOMERS}`,
    NEWS: `#${HOME_SECTION_IDS.NEWS}`,
    CONTACT: `#${HOME_SECTION_IDS.CONTACT}`,
  },
} as const;
