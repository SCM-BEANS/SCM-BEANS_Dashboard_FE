import { useRouter } from "next/router";
import { LocationsManagementPanel } from "@/components/features/asset-management/locations-management-panel";
import { LocationDetailPanel } from "@/components/features/locations/location-detail-panel";
import { PATH_MODERATOR } from "@/routes/path";
import { ModeratorPageHeading } from "../moderator-page-heading";
import { moderatorStyles as styles } from "../moderator-shell";

export function ModeratorLocationsScreen() {
  const router = useRouter();
  const locationId = typeof router.query.id === "string" ? router.query.id : "";
  const ownerId = typeof router.query.ownerId === "string" ? router.query.ownerId : "";
  const backHref = ownerId
    ? `${PATH_MODERATOR.LOCATIONS}?ownerId=${encodeURIComponent(ownerId)}`
    : PATH_MODERATOR.LOCATIONS;
  return (
    <div className={styles.pageContent}>
      <ModeratorPageHeading
        title="Địa điểm"
        description="Quản lý địa điểm của Owner trong phạm vi hồ sơ mà Moderator được phép xem."
      />
      {locationId ? <LocationDetailPanel
        locationId={locationId}
        backHref={backHref}
        machineDetailHref={(machineId) => PATH_MODERATOR.MACHINE_DETAIL(machineId)}
        tableVariant="moderator"
      /> : <LocationsManagementPanel mode="moderator" ownerId={null} tableVariant="moderator" />}
    </div>
  );
}
