import Link from "next/link";
import { RecipeManagementScreen } from "@/components/features/recipe-menus/recipe-menus-screen";
import { ButtonBar } from "@/components/button/button-bar";
import { PATH_CUSTOMER } from "@/routes/path";
import styles from "@/components/features/repair-workflow/repair-workflow.module.css";
import pageStyles from "../customer-shell.module.css";

const ownerMenuSections = [
  { key: "library", label: "Thư viện Dolores", href: PATH_CUSTOMER.MENU },
  { key: "mine", label: "Menu của tôi", href: PATH_CUSTOMER.MENU_ADJUSTMENTS },
  { key: "sync", label: "Đồng bộ với máy", href: PATH_CUSTOMER.MENU_SYNC },
] as const;

export function OwnerMenuHeader({ active }: { active: "library" | "mine" | "sync" }) {
  return <>
    <header className={pageStyles.pageHeading}>
      <h1>Công thức pha chế</h1>
      <p>{active === "library" ? "Khám phá công thức Dolores và lưu món yêu thích vào menu riêng." : active === "mine" ? "Quản lý menu, thêm món riêng và giữ các công thức bạn đã lưu." : "Chọn máy để gửi công thức và theo dõi kết quả cập nhật."}</p>
    </header>
    <nav className={styles.recipeMenuTabs} aria-label="Khu vực công thức">
      {ownerMenuSections.map((item) => <Link key={item.key} href={item.href} aria-current={active === item.key ? "page" : undefined}
        className={active === item.key ? styles.recipeMenuTabActive : undefined}>{item.label}</Link>)}
    </nav>
  </>;
}

export function MenuScreen({ initialGlobalRecipeId }: { initialGlobalRecipeId?: string }) {
  return <section className={pageStyles.pageContent}>
    <OwnerMenuHeader active="library" />
    {initialGlobalRecipeId ? <div><ButtonBar href={PATH_CUSTOMER.MENU}>← Về thư viện Dolores</ButtonBar></div> : null}
    <RecipeManagementScreen key={initialGlobalRecipeId ?? "library"} role="owner" showHeading={false} showNavigation={false}
      initialGlobalRecipeId={initialGlobalRecipeId} detailOnly={Boolean(initialGlobalRecipeId)} />
  </section>;
}
