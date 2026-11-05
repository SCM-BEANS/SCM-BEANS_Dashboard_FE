import { useRouter } from "next/router";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { RecipeSyncPanel } from "@/components/features/recipe-menus/recipe-sync-panel";
import { PATH_CUSTOMER } from "@/routes/path";
import styles from "@/components/features/repair-workflow/repair-workflow.module.css";
import pageStyles from "../customer-shell.module.css";

export function OwnerRecipeSyncScreen() {
  const router = useRouter();
  return <section className={pageStyles.pageContent}>
    <BackButtonHeading title="Đồng bộ công thức với máy" titleId="owner-recipe-sync-title" description="Theo dõi lệnh và xác nhận áp dụng từ thiết bị." className={pageStyles.pageHeading}
      back={{ label: "Thư viện công thức", fallbackHref: PATH_CUSTOMER.MENU }} />
    <nav className={styles.recipeMenuTabs} aria-label="Khu vực công thức">
      <ButtonBar onClick={() => void router.push(PATH_CUSTOMER.MENU)}>Thư viện dùng chung</ButtonBar>
      <ButtonBar onClick={() => void router.push(PATH_CUSTOMER.MENU_ADJUSTMENTS)}>Menu của tôi</ButtonBar>
      <ButtonBar className={styles.recipeMenuTabActive} aria-pressed="true">Đồng bộ với máy</ButtonBar>
    </nav>
    <RecipeSyncPanel role="OWNER" />
  </section>;
}
