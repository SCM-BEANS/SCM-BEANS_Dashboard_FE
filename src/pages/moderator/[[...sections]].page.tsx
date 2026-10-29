import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { lazy, Suspense } from "react";
import { isSupportedModeratorSection, MODERATOR_NAVIGATION_LINKS } from "@/routes/routes";
import { PATH_MODERATOR } from "@/routes/path";
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
    /^contracts\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/installation-request$/i.test(sectionPath) ||
    sectionPath === "notifications" ||
    sectionPath === "notifications/alerts" ||
    sectionPath === "machines" ||
    sectionPath.startsWith("machines/") ||
    sectionPath === "iot" ||
    sectionPath === "iot/customer" ||
    sectionPath === "iot/machines" ||
    sectionPath === "technical-requests" ||
    sectionPath.startsWith("technical-requests/") ||
    sectionPath === "machine-history" ||
    sectionPath.startsWith("machine-history/") ||
    sectionPath === "invoices" ||
    sectionPath === "invoices/list" ||
    /^invoices\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sectionPath) ||
    sectionPath === "menu" ||
    /^menu\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sectionPath) ||
    sectionPath === "buyback" ||
    sectionPath === "buyback/list" ||
    /^buyback\/(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|MB-[A-Z0-9-]+)$/i.test(sectionPath);
}

export const getServerSideProps: GetServerSideProps<ModeratorPageProps> = async ({ params }) => {
  const sections = params?.sections;
  const sectionPath = Array.isArray(sections)
    ? sections.join("/")
    : typeof sections === "string"
      ? sections
      : "";

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
            <section className={moderatorStyles.pendingNotice} aria-live="polite">
              {MODERATOR_MESSAGES.ROUTES.PENDING}
            </section>
          </div>
        )}
    </ModeratorShell>
  );
}
