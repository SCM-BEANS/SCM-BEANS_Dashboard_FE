import { useRouter } from "next/router";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { getModeratorBackDestination } from "./moderator-back-destination";
import { moderatorStyles as styles } from "./moderator-shell";

export function ModeratorPageHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const router = useRouter();
  const back = getModeratorBackDestination(router.asPath);

  return (
    <BackButtonHeading
      title={title}
      titleId="moderator-page-title"
      description={description}
      className={styles.pageHeading}
      back={back}
    />
  );
}
