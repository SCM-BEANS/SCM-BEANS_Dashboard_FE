import { Panel } from "@/components/panel/panel";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { lazy, Suspense } from "react";
import { isSupportedModeratorSection, MODERATOR_NAVIGATION_LINKS } from "@/routes/routes";
import { PATH_MODERATOR } from "@/routes/path";
import { GlobalRecipeIdSchema } from "@/schema/recipes.schema";
import { CoffeePackageOrderIdSchema } from "@/schema/coffee-packages.schema";
import { BuybackIdSchema } from "@/schema/buybacks.schema";
import { ContractIdSchema } from "@/schema/contracts.schema";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { ModeratorShell, moderatorStyles } from "./moderator-shell";
import { ModeratorPageHeading } from "./moderator-page-heading";

const ModeratorReadScreen = lazy(() =>
  import("./moderator-read-screens").then((module) => ({
    default: module.ModeratorReadScreen,
  })),
);

interface ModeratorPageProps {
  sectionPath: string;
}

export function isModeratorReadRoute(sectionPath: string): boolean {
  return sectionPath === "" ||
    (/^contracts\/[^/]+\/(?:history|installation-request)$/.test(sectionPath) && ContractIdSchema.safeParse(sectionPath.split("/")[1]).success) ||
    sectionPath === "notifications" ||
    sectionPath === "notifications/alerts" ||
    sectionPath === "machines" ||
    sectionPath.startsWith("machines/") ||
    sectionPath === "stores" ||
    sectionPath === "locations" ||
    sectionPath === "iot" ||
    sectionPath === "iot/customer" ||
    sectionPath === "iot/machines" ||
    sectionPath === "technical-requests" ||
    sectionPath.startsWith("technical-requests/") ||
    sectionPath === "machine-history" ||
    sectionPath.startsWith("machine-history/") ||
    sectionPath === "coffee-packages" ||
    (sectionPath.startsWith("coffee-packages/") && CoffeePackageOrderIdSchema.safeParse(sectionPath.slice("coffee-packages/".length)).success) ||
    sectionPath === "menu" ||
    sectionPath === "menu/new" ||
    (sectionPath.startsWith("menu/") && GlobalRecipeIdSchema.safeParse(sectionPath.slice("menu/".length)).success) ||
    sectionPath === "buyback" ||
    sectionPath === "buyback/list" ||
    sectionPath === "buyback/new" ||
    (sectionPath.startsWith("buyback/") && BuybackIdSchema.safeParse(sectionPath.slice("buyback/".length)).success) ||
    /^buyback\/MB-[A-Z0-9-]+$/i.test(sectionPath);
}

export const getServerSideProps: GetServerSideProps<ModeratorPageProps> = async ({ params, query }) => {
  const sections = params?.sections;
  const sectionPath = Array.isArray(sections)
    ? sections.join("/")
    : typeof sections === "string"
      ? sections
      : "";

  if (sectionPath === "locations") {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key !== "sections" && typeof value === "string") search.set(key, value);
    }
    return { redirect: { destination: PATH_MODERATOR.STORES + (search.size ? `?${search}` : ""), permanent: false } };
  }

  if (!isSupportedModeratorSection(sectionPath)) {
    return { notFound: true };
  }

  return { props: { sectionPath } };
};

export default function ModeratorRoutePage({
  sectionPath,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const routePath = sectionPath
    ? PATH_MODERATOR.ROOT + "/" + sectionPath
    : PATH_MODERATOR.ROOT;
  const activeNavigation = MODERATOR_NAVIGATION_LINKS.find(
    (item) => item.HREF === routePath ||
      (item.HREF !== PATH_MODERATOR.ROOT && routePath.startsWith(item.HREF + "/")),
  );
  const isReadScreen = isModeratorReadRoute(sectionPath);
  const isOverview = sectionPath === "";
  const isNotifications = sectionPath === "notifications";
  const isAlerts = sectionPath === "notifications/alerts";
  const pageTitle = isOverview
    ? MODERATOR_MESSAGES.READ_SCREENS.OVERVIEW_TITLE
    : isNotifications
      ? MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATIONS_TITLE
      : isAlerts
        ? MODERATOR_MESSAGES.READ_SCREENS.ALERTS_TITLE
        : activeNavigation?.LABEL ?? MODERATOR_MESSAGES.ROUTES.PENDING_TITLE;

  return (
    <ModeratorShell pageTitle={pageTitle}>
      {isReadScreen
        ? (
          <Suspense fallback={
            <div className={moderatorStyles.pageContent}>
              <p className={moderatorStyles.pendingNotice} role="status">
                {MODERATOR_MESSAGES.READ_SCREENS.LOADING_OVERVIEW}
              </p>
            </div>
          }>
            <ModeratorReadScreen sectionPath={sectionPath} />
          </Suspense>
        )
        : (
          <div className={moderatorStyles.pageContent}>
            <ModeratorPageHeading title={pageTitle} />
            <Panel role="status" className={moderatorStyles.pendingNotice} aria-live="polite">
              {MODERATOR_MESSAGES.ROUTES.PENDING}
            </Panel>
          </div>
        )}
    </ModeratorShell>
  );
}
