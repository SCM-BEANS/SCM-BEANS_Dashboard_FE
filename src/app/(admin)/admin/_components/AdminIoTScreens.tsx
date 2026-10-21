'use client';

import Link from 'next/link';
import {
  DoloresApiErrorState,
  DoloresEmptyState,
  DoloresLoadingState,
} from '@/app/_ui/dolores/DoloresApiState';
import {
  DoloresButton,
  DoloresNotice,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresStatCard,
  DoloresTable,
} from '@/app/_ui/dolores/DoloresUI';
import { DoloresPage } from '@/app/_shell/dolores/DoloresShell';
import { useDashboardOverview } from '@/hooks/dolores/useDashboardOverview';
import { useMachineInventory } from '@/hooks/dolores/useMachines';
import { usePlatformContracts } from '@/hooks/dolores/useContracts';
import { usePlatformLocations } from '@/hooks/dolores/usePlatformLocations';
import { useTenants } from '@/hooks/dolores/useTenants';
import { PATH_ADMIN } from '@/routes/path';
import type { Contract } from '@/schemas/dolores/contracts';
import type { MachineInventoryItem } from '@/schemas/dolores/machines';

type AdminIoTScreensProps = {
  selectedTenantId?: string;
};

const MACHINE_STATUS_LABELS: Record<NonNullable<MachineInventoryItem['status']>, string> = {
  IN_WAREHOUSE: 'Trong kho',
  PENDING_ACTIVATION: 'Chờ kích hoạt',
  DEPLOYED_CONTRACT_OWNER: 'Đang triển khai · chủ hợp đồng',
  DEPLOYED_STORE_OWNER: 'Đang triển khai · chủ cửa hàng',
  UNDER_MAINTENANCE: 'Đang bảo trì',
  REFURBISHING: 'Đang tân trang',
  PENDING_QA: 'Chờ kiểm định',
  AVAILABLE_FOR_RENT: 'Sẵn sàng cho thuê',
  RETIRED: 'Đã ngừng sử dụng',
};

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : new Intl.NumberFormat('vi-VN').format(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(parsed);
}

function formatStatus(status: MachineInventoryItem['status']): string {
  return status ? MACHINE_STATUS_LABELS[status] : '—';
}

function currentMonthRange() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${now.getFullYear()}-${month}`;
  return {
    fromDate: `${datePrefix}-01`,
    toDate: `${datePrefix}-${day}`,
    label: new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(now),
  };
}

function activeContractsForTenant(tenantId: string, contracts: { tenant: { id: string }; contract: Contract }[]) {
  return contracts
    .filter(({ tenant, contract }) => tenant.id === tenantId && contract.status === 'ACTIVE');
}

function contractTypeLabel(type: Contract['machineTypeSnapshot']): string {
  if (type === 'SMART_IOT') return 'Smart IoT';
  if (type === 'CONVENTIONAL') return 'Máy thường';
  return 'Chưa có dữ liệu loại';
}

function machineContractType(machineId: string, contracts: { contract: Contract }[]): string {
  const types = new Set(
    contracts
      .filter(({ contract }) => contract.machineId === machineId)
      .map(({ contract }) => contract.machineTypeSnapshot)
      .filter((type): type is 'SMART_IOT' | 'CONVENTIONAL' => type !== null && type !== undefined)
  );

  if (types.size === 1) return contractTypeLabel([...types][0]);
  if (types.size > 1) return 'Có nhiều loại trong hợp đồng';
  return 'Chưa có dữ liệu loại';
}

function metricValue(value: number | undefined, isPending: boolean, isComplete = true): string {
  if (isPending) return '…';
  if (!isComplete || value === undefined) return '—';
  return formatNumber(value);
}

export default function AdminIoTScreens({ selectedTenantId }: AdminIoTScreensProps) {
  const period = currentMonthRange();
  const tenantsQuery = useTenants();
  const inventoryQuery = useMachineInventory();
  const overviewQuery = useDashboardOverview(period.fromDate, period.toDate);
  const tenants = tenantsQuery.data ?? [];
  const locations = usePlatformLocations(tenantsQuery.data);
  const contracts = usePlatformContracts(tenantsQuery.data, tenantsQuery.data !== undefined);
  const machines = inventoryQuery.data ?? [];
  const metrics = overviewQuery.data?.operationalMetrics;

  const refresh = () => {
    void tenantsQuery.refetch();
    void inventoryQuery.refetch();
    void overviewQuery.refetch();
    contracts.refetchAll();
    locations.refetchAll();
  };

  if (selectedTenantId) {
    if (tenantsQuery.isPending) {
      return (
        <DoloresPage title="Giám sát Smart IoT · theo khách hàng" description="Đang tải hồ sơ khách hàng từ Dolores." actions={<DoloresButton href={PATH_ADMIN.iot} variant="secondary">Về tổng quan</DoloresButton>}>
          <DoloresLoadingState />
        </DoloresPage>
      );
    }

    if (tenantsQuery.isError) {
      return (
        <DoloresPage title="Giám sát Smart IoT · theo khách hàng" description="Không tải được hồ sơ khách hàng." actions={<DoloresButton href={PATH_ADMIN.iot} variant="secondary">Về tổng quan</DoloresButton>}>
          <DoloresApiErrorState error={tenantsQuery.error} onRetry={() => { void tenantsQuery.refetch(); }} />
        </DoloresPage>
      );
    }

    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
    if (!selectedTenant) {
      return (
        <DoloresPage title="Giám sát Smart IoT · theo khách hàng" description="Không tìm thấy khách hàng trong dữ liệu Dolores." actions={<DoloresButton href={PATH_ADMIN.iot} variant="secondary">Về tổng quan</DoloresButton>}>
          <DoloresEmptyState message="Khách hàng không tồn tại hoặc không nằm trong phạm vi tài khoản hiện tại." />
        </DoloresPage>
      );
    }

    const tenantMachines = machines.filter((machine) => machine.tenantId === selectedTenant.id);
    const activeContracts = activeContractsForTenant(selectedTenant.id, contracts.contracts);
    const tenantLocations = locations.locations.filter(({ tenant }) => tenant.id === selectedTenant.id);
    const locationsFailed = locations.failedTenants.some(({ tenant }) => tenant.id === selectedTenant.id);
    const contractsFailed = contracts.failedTenants.some(({ tenant }) => tenant.id === selectedTenant.id);
    const smartContractCount = activeContracts.filter(({ contract }) => contract.machineTypeSnapshot === 'SMART_IOT').length;
    const conventionalContractCount = activeContracts.filter(({ contract }) => contract.machineTypeSnapshot === 'CONVENTIONAL').length;

    return (
      <DoloresPage
        title={`Máy của ${selectedTenant.name}`}
        description="Danh sách máy, cửa hàng và hợp đồng được ghép theo tenantId từ API Dolores. Mở hồ sơ máy để xem loại máy đã xác nhận, heartbeat và telemetry."
        actions={
          <>
            <DoloresButton href={PATH_ADMIN.iot} variant="secondary">Về tổng quan khách hàng</DoloresButton>
            <DoloresButton href={PATH_ADMIN.machines} variant="secondary">Kho máy</DoloresButton>
            <DoloresButton onClick={refresh}>Làm mới</DoloresButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <DoloresStatCard label="Cửa hàng" value={metricValue(tenantLocations.length, locations.isLoading, !locationsFailed)} />
          <DoloresStatCard label="Tổng máy" value={metricValue(tenantMachines.length, inventoryQuery.isPending, !inventoryQuery.isError)} />
          <DoloresStatCard label="Hợp đồng Smart IoT đang hiệu lực" value={metricValue(smartContractCount, contracts.isLoading, !contractsFailed)} />
          <DoloresStatCard label="Hợp đồng máy thường đang hiệu lực" value={metricValue(conventionalContractCount, contracts.isLoading, !contractsFailed)} />
        </div>

        {locationsFailed && (
          <DoloresNotice title="Chưa tải đủ dữ liệu cửa hàng" tone="warning">
            <p>API cửa hàng của khách hàng này chưa trả dữ liệu. Hãy thử tải lại để cập nhật số cửa hàng.</p>
            <div className="mt-3"><DoloresButton onClick={locations.retryFailed} variant="secondary">Thử tải lại</DoloresButton></div>
          </DoloresNotice>
        )}
        {contractsFailed && (
          <DoloresNotice title="Chưa tải đủ dữ liệu hợp đồng" tone="warning">
            <p>Không thể tính số hợp đồng theo loại máy cho khách hàng này.</p>
            <div className="mt-3"><DoloresButton onClick={contracts.retryFailed} variant="secondary">Thử tải lại</DoloresButton></div>
          </DoloresNotice>
        )}
        {inventoryQuery.isError && <DoloresApiErrorState error={inventoryQuery.error} onRetry={() => { void inventoryQuery.refetch(); }} />}

        <DoloresPanel>
          <DoloresPanelTitle>Cửa hàng</DoloresPanelTitle>
          {locations.isLoading ? (
            <DoloresLoadingState />
          ) : locationsFailed && tenantLocations.length === 0 ? (
            <DoloresApiErrorState
              error={locations.failedTenants.find(({ tenant }) => tenant.id === selectedTenant.id)?.error}
              onRetry={locations.retryFailed}
            />
          ) : tenantLocations.length === 0 && !locationsFailed ? (
            <DoloresEmptyState message="API chưa ghi nhận cửa hàng nào cho khách hàng này." />
          ) : (
            <DoloresTable
              headers={['Cửa hàng', 'Địa chỉ', 'Thành phố', 'Liên hệ', 'Trạng thái']}
              rows={tenantLocations.map(({ location }) => [
                location.name,
                location.address ?? '—',
                location.city ?? '—',
                location.contactPerson ?? location.phoneNumber ?? '—',
                location.active === null || location.active === undefined ? '—' : location.active ? 'Đang hoạt động' : 'Ngừng hoạt động',
              ])}
            />
          )}
        </DoloresPanel>

        <DoloresPanel>
          <DoloresPanelTitle>Máy của khách hàng</DoloresPanelTitle>
          {inventoryQuery.isPending ? (
            <DoloresLoadingState />
          ) : inventoryQuery.isError ? (
            <DoloresApiErrorState error={inventoryQuery.error} onRetry={() => { void inventoryQuery.refetch(); }} />
          ) : tenantMachines.length === 0 ? (
            <DoloresEmptyState message="API chưa trả về máy nào gắn với tenant này." />
          ) : (
            <>
              <p className="-mt-2 mb-4 text-sm leading-[1.45] text-[#706561]">
                Loại ở bảng hợp đồng dựa trên machineTypeSnapshot. Nếu chưa có dữ liệu loại, mở hồ sơ máy để xem machineType hiện tại.
              </p>
              <DoloresTable
                headers={['Máy', 'Loại theo hợp đồng', 'Trạng thái', 'Khu vực', 'Triển khai', 'Hồ sơ']}
                rows={tenantMachines.map((machine) => [
                  machine.serialNumber ?? machine.id,
                  machineContractType(machine.id, activeContracts),
                  formatStatus(machine.status),
                  machine.region ?? '—',
                  formatDate(machine.deployedAt),
                  <Link className="font-semibold text-[#B81724] hover:underline" href={PATH_ADMIN.machineDetail(machine.id)} key={`${machine.id}-detail`}>
                    Mở hồ sơ
                  </Link>,
                ])}
              />
            </>
          )}
        </DoloresPanel>
      </DoloresPage>
    );
  }

  const locationsComplete = !tenantsQuery.isError && !locations.isLoading && locations.failedTenants.length === 0;
  const contractsComplete = !tenantsQuery.isError && !contracts.isLoading && contracts.failedTenants.length === 0;
  const allActiveContracts = contracts.contracts.filter(({ contract }) => contract.status === 'ACTIVE');
  const activeSmartContracts = allActiveContracts.filter(({ contract }) => contract.machineTypeSnapshot === 'SMART_IOT').length;
  const storeNamesForTenant = (tenantId: string) => {
    if (locations.isLoading) return 'Đang tải…';
    if (locations.failedTenants.some(({ tenant }) => tenant.id === tenantId)) return '—';
    const names = locations.locations
      .filter(({ tenant }) => tenant.id === tenantId)
      .map(({ location }) => location.name);
    if (names.length === 0) return 'Chưa có cửa hàng';
    const visibleNames = names.slice(0, 2).join(', ');
    return names.length > 2 ? `${visibleNames} và ${names.length - 2} cửa hàng khác` : visibleNames;
  };

  return (
    <DoloresPage
      title="Giám sát Smart IoT · theo khách hàng"
      description="Khách hàng, cửa hàng, máy và hợp đồng được tải từ API Dolores. Số ly là tổng toàn hệ thống trong tháng hiện tại; heartbeat và telemetry xem trong hồ sơ từng máy Smart IoT."
      actions={
        <>
          <DoloresButton href={PATH_ADMIN.machines} variant="secondary">Kho máy</DoloresButton>
          <DoloresButton onClick={refresh}>Làm mới</DoloresButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <DoloresStatCard label="Khách hàng Dolores" value={metricValue(tenantsQuery.data?.length, tenantsQuery.isPending, !tenantsQuery.isError)} />
        <DoloresStatCard label="Cửa hàng Dolores" value={metricValue(locations.locations.length, tenantsQuery.isPending || locations.isLoading, locationsComplete)} />
        <DoloresStatCard label="Hợp đồng Smart IoT đang hiệu lực" value={metricValue(activeSmartContracts, tenantsQuery.isPending || contracts.isLoading, contractsComplete)} />
        <DoloresStatCard label={`Ly toàn hệ thống · ${period.label}`} value={metricValue(metrics?.cupsInSelectedPeriod ?? undefined, overviewQuery.isPending, !overviewQuery.isError)} />
      </div>

      {overviewQuery.isError && <DoloresApiErrorState error={overviewQuery.error} onRetry={() => { void overviewQuery.refetch(); }} />}
      {inventoryQuery.isError && <DoloresApiErrorState error={inventoryQuery.error} onRetry={() => { void inventoryQuery.refetch(); }} />}
      {locations.failedTenants.length > 0 && (
        <DoloresNotice title="Một số cửa hàng chưa tải được" tone="warning">
          <p>{locations.failedTenants.length} khách hàng chưa tải đủ dữ liệu cửa hàng. Bảng sẽ đánh dấu các dòng bị thiếu dữ liệu.</p>
          <div className="mt-3"><DoloresButton onClick={locations.retryFailed} variant="secondary">Thử tải lại</DoloresButton></div>
        </DoloresNotice>
      )}
      {contracts.failedTenants.length > 0 && (
        <DoloresNotice title="Một số hợp đồng chưa tải được" tone="warning">
          <p>{contracts.failedTenants.length} khách hàng chưa tải đủ dữ liệu hợp đồng. Các số liệu hợp đồng sẽ hiển thị dấu gạch cho những dòng đó.</p>
          <div className="mt-3"><DoloresButton onClick={contracts.retryFailed} variant="secondary">Thử tải lại</DoloresButton></div>
        </DoloresNotice>
      )}

      {tenantsQuery.isPending ? (
        <DoloresPanel><DoloresLoadingState /></DoloresPanel>
      ) : tenantsQuery.isError ? (
        <DoloresPanel><DoloresApiErrorState error={tenantsQuery.error} onRetry={() => { void tenantsQuery.refetch(); }} /></DoloresPanel>
      ) : tenants.length === 0 ? (
        <DoloresPanel><DoloresEmptyState message="API Dolores chưa trả về khách hàng nào trong phạm vi này." /></DoloresPanel>
      ) : (
        <DoloresPanel>
          <DoloresPanelTitle>Danh sách khách hàng</DoloresPanelTitle>
          <p className="-mt-2 mb-4 text-sm leading-[1.45] text-[#706561]">
            Số Smart / thường được tính từ hợp đồng ACTIVE có machineTypeSnapshot. Máy chưa có hợp đồng hoặc chưa được ánh xạ loại sẽ được xác nhận trong hồ sơ máy.
          </p>
          {inventoryQuery.isPending ? (
            <DoloresLoadingState />
          ) : (
            <DoloresTable
              headers={['Khách hàng', 'Cửa hàng', 'Tổng máy', 'Hợp đồng Smart / thường', 'Mở hồ sơ']}
              rows={tenants.map((tenant) => {
                const tenantMachines = machines.filter((machine) => machine.tenantId === tenant.id);
                const tenantContracts = activeContractsForTenant(tenant.id, contracts.contracts);
                const contractsFailed = contracts.failedTenants.some(({ tenant: failedTenant }) => failedTenant.id === tenant.id);
                const smart = tenantContracts.filter(({ contract }) => contract.machineTypeSnapshot === 'SMART_IOT').length;
                const conventional = tenantContracts.filter(({ contract }) => contract.machineTypeSnapshot === 'CONVENTIONAL').length;
                const storeNames = storeNamesForTenant(tenant.id);

                return [
                  <Link className="font-semibold text-[#302927] hover:text-[#B81724]" href={`${PATH_ADMIN.iot}?tenantId=${encodeURIComponent(tenant.id)}`} key={`tenant-${tenant.id}`}>
                    {tenant.name}
                  </Link>,
                  <span title={storeNames} key={`stores-${tenant.id}`}>{storeNames}</span>,
                  inventoryQuery.isError ? '—' : formatNumber(tenantMachines.length),
                  contracts.isLoading ? 'Đang tải…' : contractsFailed ? '—' : `${formatNumber(smart)} / ${formatNumber(conventional)}`,
                  <Link className="font-semibold text-[#B81724] hover:underline" href={`${PATH_ADMIN.iot}?tenantId=${encodeURIComponent(tenant.id)}`} key={`open-${tenant.id}`}>
                    Xem máy
                  </Link>,
                ];
              })}
            />
          )}
        </DoloresPanel>
      )}
    </DoloresPage>
  );
}
