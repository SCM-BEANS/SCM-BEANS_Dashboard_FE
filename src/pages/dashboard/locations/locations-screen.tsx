import { useRouter } from "next/router";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { LocationsManagementPanel } from "@/components/features/asset-management/locations-management-panel";
import { LocationDetailPanel } from "@/components/features/locations/location-detail-panel";
import { PATH_CUSTOMER } from "@/routes/path";
import { useOwnerSubject } from "../shared/customer-screen-common";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import styles from "../customer-shell.module.css";

export function LocationsScreen() {
  const router = useRouter();
  const { ownerId, checked } = useOwnerSubject();
  const locationId = typeof router.query.id === "string" ? router.query.id : "";
  const messages = CUSTOMER_MESSAGES.READ_SCREENS;

  return (
    <section className={styles.pageContent} aria-labelledby="customer-locations-title">
      <BackButtonHeading
        back={locationId ? { label: "Về danh sách địa điểm", fallbackHref: PATH_CUSTOMER.LOCATIONS } : null}
        title="Địa điểm của tôi"
        titleId="customer-locations-title"
        description="Xem và tạo địa điểm trong phạm vi Owner đang đăng nhập."
        className={styles.pageHeading}
      />
      {!checked ? <p className={styles.loadingNotice} role="status">{messages.LOADING}</p> : ownerId ? locationId ? (
        <LocationDetailPanel
          locationId={locationId}
          machineDetailHref={(machineId) => PATH_CUSTOMER.MACHINE_DETAIL(machineId)}
          tableVariant="customer"
        />
      ) : (
        <LocationsManagementPanel mode="owner" ownerId={ownerId} tableVariant="customer" />
      ) : <div className={styles.errorNotice} role="alert">{messages.IDENTITY_UNAVAILABLE}</div>}
    </section>
  );
}
