import { LocationsManagementPanel } from "@/components/features/asset-management/locations-management-panel";
import { ModeratorPageHeading } from "../moderator-page-heading";
import { moderatorStyles as styles } from "../moderator-shell";

export function ModeratorLocationsScreen() {
  return (
    <div className={styles.pageContent}>
      <ModeratorPageHeading
        title="Địa điểm"
        description="Quản lý địa điểm của Owner trong phạm vi hồ sơ mà Moderator được phép xem."
      />
      <LocationsManagementPanel mode="moderator" ownerId={null} tableVariant="moderator" />
    </div>
  );
}
