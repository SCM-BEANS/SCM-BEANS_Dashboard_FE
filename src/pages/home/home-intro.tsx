import { BrandMark } from "@/components/brand/brand-logo";
import styles from "./home-intro.module.css";

interface HomeIntroProps {
  phase: "entering" | "exiting";
}

export function HomeIntro({ phase }: HomeIntroProps) {
  return (
    <div
      className={styles.splash}
      data-intro-splash="true"
      data-phase={phase}
      role="status"
      aria-label="Đang mở Dolores"
    >
      <div className={styles.lockup}>
        <BrandMark priority />
        <span className={styles.wordmark}>dolores.</span>
      </div>
    </div>
  );
}
