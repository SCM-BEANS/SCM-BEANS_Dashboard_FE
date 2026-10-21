"use client";

import type { AdminCustomerView as CustomerView } from "@/routes/query";
import Link from "next/link";
import { buildRouteUrl } from "@/routes/query";
import { PATH_ADMIN } from "@/routes/path";
import { DoloresEmptyState, DoloresLoadingState } from "@/app/_ui/dolores/DoloresApiState";
import { DoloresButton, DoloresMetric, DoloresPanel, DoloresPanelTitle, DoloresStatCard, DoloresTable } from "@/app/_ui/dolores/DoloresUI";
import { DoloresPage } from "@/app/_shell/dolores/DoloresShell";
import { useTenants, useTenant } from "@/hooks/dolores/useTenants";
import { usePlatformLocations } from "@/hooks/dolores/usePlatformLocations";

const tenantType = (type: string | null | undefined) => {
  if (type === "contract_owner") return "Chủ hợp đồng";
  if (type === "store_owner") return "Chủ cửa hàng";
  return type ?? "—";
};

export default function AdminCustomerScreens({ initialView = "list", tenantId }: { initialView?: CustomerView; tenantId?: string }) {
  const tenants = useTenants(initialView !== "customer");
  const detail = useTenant(initialView === "customer" ? tenantId : undefined);
  const stores = usePlatformLocations(detail.data ? [detail.data] : undefined);

  if (initialView === "customer") {
    return (
      <DoloresPage title={detail.data?.name ?? "Thông tin khách hàng"} description="Hồ sơ tenant trong phạm vi quyền của tài khoản." actions={<><DoloresButton href={PATH_ADMIN.businesses} variant="secondary">Về danh sách</DoloresButton>{detail.data && <DoloresButton href={buildRouteUrl(PATH_ADMIN.stores, { tenantId: detail.data.id })}>Xem cửa hàng</DoloresButton>}</>}>
        {!tenantId && <DoloresEmptyState message="Chọn một khách hàng từ danh sách để xem chi tiết." />}
        {tenantId && detail.isPending && <DoloresLoadingState />}
        {detail.isError && !detail.data && <DoloresEmptyState message="Hồ sơ khách hàng hiện chưa có dữ liệu để hiển thị." />}
        {detail.data && <>
          <div className="grid grid-cols-4 gap-3">
            <DoloresMetric label="Loại tenant" value={tenantType(detail.data.type)} />
            <DoloresMetric label="Cửa hàng" value={stores.isLoading || stores.failedTenants.length ? "—" : String(stores.locations.length)} />
            <DoloresMetric label="Miễn thanh toán" value={detail.data.billingExempt == null ? "—" : detail.data.billingExempt ? "Có" : "Không"} />
            <DoloresMetric label="Mã tenant" value={detail.data.id.slice(0, 8)} />
          </div>
          <DoloresPanel>
            <DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
              <div><p className="text-[#706561]">Tên tổ chức</p><p className="mt-1 font-semibold">{detail.data.name}</p></div>
              <div><p className="text-[#706561]">Loại</p><p className="mt-1 font-semibold">{tenantType(detail.data.type)}</p></div>
              <div><p className="text-[#706561]">Tenant ID</p><p className="mt-1 break-all font-semibold">{detail.data.id}</p></div>
              <div><p className="text-[#706561]">Miễn thanh toán</p><p className="mt-1 font-semibold">{detail.data.billingExempt == null ? "—" : detail.data.billingExempt ? "Có" : "Không"}</p></div>
            </div>
          </DoloresPanel>
          <DoloresPanel><DoloresPanelTitle>Cửa hàng của khách hàng</DoloresPanelTitle>
            {stores.isLoading && <DoloresLoadingState />}
            {!stores.isLoading && <DoloresTable
              headers={["Cửa hàng", "Địa chỉ", "Thành phố", "Trạng thái"]}
              rows={stores.locations.map(({ location }) => [location.name, location.address ?? "—", location.city ?? "—", location.active == null ? "—" : location.active ? "Hoạt động" : "Ngừng hoạt động"])}
              emptyMessage="Không có dữ liệu."
            />}
          </DoloresPanel>
        </>}
      </DoloresPage>
    );
  }

  const tenantList = tenants.data ?? [];
  return (
    <DoloresPage title="Khách hàng & cửa hàng" description="Danh sách tenant từ Dolores trong phạm vi quyền của tài khoản." actions={<><DoloresButton href={PATH_ADMIN.stores}>Xem cửa hàng</DoloresButton><DoloresButton href={buildRouteUrl(PATH_ADMIN.users, { view: "create" })} variant="secondary">Tạo tài khoản</DoloresButton></>}>
      {tenants.isPending && <DoloresLoadingState />}
      {tenants.data && <>
        <div className="grid grid-cols-4 gap-3">
          <DoloresStatCard label="Tổng tenant" value={String(tenantList.length)} />
          <DoloresStatCard label="Chủ hợp đồng" value={String(tenantList.filter((tenant) => tenant.type === "contract_owner").length)} />
          <DoloresStatCard label="Chủ cửa hàng" value={String(tenantList.filter((tenant) => tenant.type === "store_owner").length)} />
          <DoloresStatCard label="Miễn thanh toán" value={String(tenantList.filter((tenant) => tenant.billingExempt === true).length)} />
        </div>
      </>}
      {!tenants.isPending && <DoloresPanel><DoloresPanelTitle>Danh sách</DoloresPanelTitle>
        <DoloresTable headers={["Khách hàng / tổ chức", "Loại tenant", "Miễn thanh toán", "Tenant ID"]} rows={tenantList.map((tenant) => [
          <Link className="font-semibold hover:text-[#B81724]" href={buildRouteUrl(PATH_ADMIN.businesses, { view: "customer", tenantId: tenant.id })} key={tenant.id}>{tenant.name}</Link>,
          tenantType(tenant.type),
          tenant.billingExempt == null ? "—" : tenant.billingExempt ? "Có" : "Không",
          tenant.id,
        ])} emptyMessage="Không có dữ liệu." />
      </DoloresPanel>}
    </DoloresPage>
  );
}
