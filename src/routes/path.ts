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

export const PATH_HOME = {
  ROOT: "/",
  ALIAS: "/home",
  SECTIONS: {
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

export const PATH_AUTH = {
  LOGIN: "/login",
} as const;

const ADMIN_ROOT = "/admin";

export const PATH_ADMIN = {
  ROOT: ADMIN_ROOT,
  USERS: `${ADMIN_ROOT}/users`,
  BUSINESSES: `${ADMIN_ROOT}/businesses`,
  STORES: `${ADMIN_ROOT}/stores`,
  CONTRACTS: `${ADMIN_ROOT}/contracts`,
  MACHINES: `${ADMIN_ROOT}/machines`,
  MACHINE_DETAIL: (id: string) => `${ADMIN_ROOT}/machines/${encodeURIComponent(id)}`,
  IOT: `${ADMIN_ROOT}/iot`,
  MENU: `${ADMIN_ROOT}/menu`,
  REPORTS: `${ADMIN_ROOT}/reports`,
  NOTIFICATIONS: `${ADMIN_ROOT}/notifications`,
} as const;
