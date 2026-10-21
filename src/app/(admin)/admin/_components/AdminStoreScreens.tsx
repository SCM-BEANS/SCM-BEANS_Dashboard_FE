"use client";

import type { AdminStoreView as StoreView } from "@/routes/query";
import { useRouteView } from "@/app/(admin)/admin/_components/useRouteView";
import { DoloresEmptyState, DoloresLoadingState } from "@/app/_ui/dolores/DoloresApiState";
import { DoloresButton, DoloresField, DoloresFieldGrid, DoloresPanel, DoloresPanelTitle, DoloresTable } from "@/app/_ui/dolores/DoloresUI";
import { DoloresPage } from "@/app/_shell/dolores/DoloresShell";
import { useTenants } from "@/hooks/dolores/useTenants";
import { usePlatformLocations } from "@/hooks/dolores/usePlatformLocations";

export default function AdminStoreScreens({ initialView = "list", tenantId, locationId }: { initialView?: StoreView; tenantId?: string; locationId?: string }) {
  const [view, setView] = useRouteView<StoreView>(initialView);
  const tenants = useTenants();
  const selectedTenants = tenantId ? tenants.data?.filter((tenant) => tenant.id === tenantId) : tenants.data;
  const stores = usePlatformLocations(selectedTenants);
  const selected = stores.locations.find(({ location }) => location.id === locationId);

  if (view === "detail") {
    const isLoading = tenants.isPending || stores.isLoading;
    const hasRequestError = tenants.isError || stores.failedTenants.length > 0;

    return (
      <DoloresPage title={selected?.location.name ?? "Thông tin cửa hàng"} description="Thông tin cửa hàng được trả về từ Dolores." actions={<><DoloresButton onClick={() => setView("list", { locationId: null })} variant="secondary">Về danh sách</DoloresButton><DoloresButton disabled>Chỉnh sửa chưa hỗ trợ</DoloresButton></>}>
        {isLoading && <DoloresLoadingState />}
        {!isLoading && !selected && hasRequestError && <DoloresEmptyState message="Thông tin cửa hàng hiện chưa có dữ liệu để hiển thị." />}
        {!isLoading && !hasRequestError && !selected && <DoloresEmptyState message="Không tìm thấy cửa hàng đã chọn trong dữ liệu có quyền truy cập." />}
        {selected && <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid>
          <DoloresField label="Tên cửa hàng" value={selected.location.name} />
          <DoloresField label="Tenant phụ trách" value={selected.tenant.name} />
          <DoloresField label="Địa chỉ" value={selected.location.address ?? "—"} />
          <DoloresField label="Thành phố" value={selected.location.city ?? "—"} />
          <DoloresField label="Người liên hệ" value={selected.location.contactPerson ?? "—"} />
          <DoloresField label="Số điện thoại" value={selected.location.phoneNumber ?? "—"} />
          <DoloresField label="Trạng thái" value={selected.location.active == null ? "—" : selected.location.active ? "Hoạt động" : "Ngừng hoạt động"} />
          <DoloresField label="Mã cửa hàng" value={selected.location.id} />
        </DoloresFieldGrid></DoloresPanel>}
      </DoloresPage>
    );
  }

  return (
    <DoloresPage title="Cửa hàng" description="Danh sách cửa hàng theo tenant trong phạm vi quyền của tài khoản." actions={<DoloresButton disabled>Tạo cửa hàng chưa hỗ trợ</DoloresButton>}>
      {tenants.isPending && <DoloresLoadingState />}
      {!tenants.isPending && stores.isLoading && <DoloresLoadingState />}
      {!tenants.isPending && !stores.isLoading && <DoloresPanel><DoloresPanelTitle>Danh sách</DoloresPanelTitle>
        <DoloresTable headers={["Cửa hàng", "Tenant", "Địa chỉ", "Trạng thái"]} rows={stores.locations.map(({ tenant, location }) => [
          <button className="text-left font-semibold hover:text-[#B81724]" key={location.id} onClick={() => setView("detail", { tenantId: tenant.id, locationId: location.id })} type="button">{location.name} ›</button>,
          tenant.name,
          [location.address, location.city].filter(Boolean).join(", ") || "—",
          location.active == null ? "—" : location.active ? "Hoạt động" : "Ngừng hoạt động",
        ])} emptyMessage="Không có dữ liệu." />
      </DoloresPanel>}
    </DoloresPage>
  );
}
