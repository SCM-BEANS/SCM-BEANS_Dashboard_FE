import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { LocationsManagementPanel } from "@/components/features/asset-management/locations-management-panel";
import { useOwnerSubject } from "../shared/customer-screen-common";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import styles from "../customer-shell.module.css";

export function LocationsScreen() {
  const { ownerId, checked } = useOwnerSubject();
  const messages = CUSTOMER_MESSAGES.READ_SCREENS;

  return (
    <section className={styles.pageContent} aria-labelledby="customer-locations-title">
      <BackButtonHeading
        back={null}
        title="Địa điểm của tôi"
        titleId="customer-locations-title"
        description="Xem và tạo địa điểm trong phạm vi Owner đang đăng nhập."
        className={styles.pageHeading}
      />
      {!checked ? <p className={styles.loadingNotice} role="status">{messages.LOADING}</p> : ownerId ? (
        <LocationsManagementPanel mode="owner" ownerId={ownerId} tableVariant="customer" />
      ) : <div className={styles.errorNotice} role="alert">{messages.IDENTITY_UNAVAILABLE}</div>}
    </section>
  );
}
