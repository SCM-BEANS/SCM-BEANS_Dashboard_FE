import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { locationsApi } from "@/apis/locations.api";
import { machineModelsApi } from "@/apis/machine-models.api";
import { machinesApi } from "@/apis/machines.api";
import { profilesApi } from "@/apis/profiles.api";
import { telemetryApi } from "@/apis/telemetry.api";
import { MachineHeartbeatPanel } from "@/components/machines/machine-heartbeat-panel";
import { usePageVisibility } from "@/components/machines/machine-heartbeat-visibility";
import { MachineDetailView } from "@/components/machines/machine-detail-view";
import { SmartIotPanel } from "@/components/machines/smart-iot-panel";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_MODERATOR } from "@/routes/path";
import { LocationIdSchema } from "@/schema/locations.schema";
import { MachineIdSchema, MachineTypeSchema, type Machine } from "@/schema/machines.schema";
import { ADMIN_OPERATIONS_MESSAGES as ADMIN_T } from "@/text/admin/admin-operations-messages";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { adminStyles } from "@/pages/admin/admin-shell";
import { moderatorStyles } from "../moderator-shell";
import { MachineMaintenanceTicketTable } from "./machine-maintenance-ticket-table";

const messages = MODERATOR_MESSAGES.READ_SCREENS;
const numberFormat = new Intl.NumberFormat("vi-VN");

const statusLabels: Record<NonNullable<Machine["status"]>, string> = {
  IN_WAREHOUSE: "Trong kho",
  PENDING_ACTIVATION: "Chờ kích hoạt",
  DEPLOYED_CONTRACT_OWNER: "Đang triển khai · Owner hợp đồng",
  DEPLOYED_STORE_OWNER: "Đang triển khai · Owner cửa hàng",
  UNDER_MAINTENANCE: "Đang bảo trì",
  REFURBISHING: "Đang tân trang",
  PENDING_QA: "Chờ kiểm định",
  AVAILABLE_FOR_RENT: "Sẵn sàng cho thuê",
  RETIRED: "Đã ngừng sử dụng",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? "—" : new Date(timestamp).toLocaleDateString("vi-VN");
}

function formatNumber(value: number | null | undefined): string {
  return value == null ? "—" : numberFormat.format(value);
}

type QueryFeedbackState = {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
};

function QueryFeedback({ query, loadingMessage }: { query: QueryFeedbackState; loadingMessage: string }) {
  if (query.isPending) return <p className={adminStyles.emptyText} role="status">{loadingMessage}</p>;
  if (!query.isError) return null;
  return (
    <div className={`${adminStyles.notice} ${adminStyles.errorNotice}`} role="alert">
      <p>{getApiErrorMessage(query.error)}</p>
      <button type="button" onClick={() => void query.refetch()}>{messages.RETRY}</button>
    </div>
  );
}

async function listVerifiedActiveTechnicians(signal: AbortSignal) {
  const firstPage = await profilesApi.list({ role: "TECHNICIAN", status: "ACTIVE", page: 0, size: 100 }, signal);
  const pages = [firstPage];
  for (let page = 1; page < firstPage.totalPages; page += 5) {
    const pageNumbers = Array.from({ length: Math.min(5, firstPage.totalPages - page) }, (_, offset) => page + offset);
    pages.push(...await Promise.all(pageNumbers.map((pageNumber) =>
      profilesApi.list({ role: "TECHNICIAN", status: "ACTIVE", page: pageNumber, size: 100 }, signal),
    )));
  }
  return pages.flatMap((page) => page.items).filter((profile) => profile.emailVerified);
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function MachineManagementActions({ machine }: { machine: Machine }) {
  const queryClient = useQueryClient();
  const [technicianId, setTechnicianId] = useState("");
  const [machineType, setMachineType] = useState<"CONVENTIONAL" | "SMART_IOT" | "">(machine.machineType ?? "");
  const [typeReason, setTypeReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const technicians = useQuery({
    queryKey: ["dolores", "profiles", "technicians", "verified-active"],
    queryFn: ({ signal }) => listVerifiedActiveTechnicians(signal),
    enabled: Boolean(machine.ownerId),
    retry: false,
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dolores", "machines"] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "inventory-summary"] }),
    ]);
    setSuccess(messages.MACHINE_ACTION_SUCCESS);
  };
  const onError = (reason: unknown) => setError(getApiErrorMessage(reason));
  const assign = useMutation({
    mutationFn: () => machinesApi.assignTechnician(technicianId, machine.id),
    onMutate: () => { setError(null); setSuccess(null); },
    onSuccess: refresh,
    onError,
  });
  const unassign = useMutation({
    mutationFn: () => machinesApi.unassignTechnician(technicianId, machine.id),
    onMutate: () => { setError(null); setSuccess(null); },
    onSuccess: refresh,
    onError,
  });
  const updateType = useMutation({
    mutationFn: () => machinesApi.setType(machine.id, { machineType: MachineTypeSchema.parse(machineType), reason: typeReason }),
    onMutate: () => { setError(null); setSuccess(null); },
    onSuccess: refresh,
    onError,
  });
  const pending = assign.isPending || unassign.isPending || updateType.isPending;
  const submitType = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateType.mutate();
  };

  return (
    <section className={adminStyles.panel} aria-labelledby="moderator-machine-management-title">
      <h2 id="moderator-machine-management-title">{messages.MACHINE_MANAGEMENT_ACTIONS}</h2>
      <div className={adminStyles.machineManagementGroups}>
        <form className={adminStyles.machineManagementGroup} onSubmit={submitType}>
          <h3>{messages.MACHINE_TYPE_UPDATE}</h3>
          <label htmlFor="moderator-machine-type">{messages.MACHINE_TYPE_UPDATE}
            <select id="moderator-machine-type" value={machineType} disabled={pending} onChange={(event) => setMachineType(event.target.value ? MachineTypeSchema.parse(event.target.value) : "")}>
              <option value="">Chọn loại máy</option>
              <option value="CONVENTIONAL">{ADMIN_T.MACHINES.CONVENTIONAL}</option>
              <option value="SMART_IOT">{ADMIN_T.MACHINES.SMART}</option>
            </select>
          </label>
          <label htmlFor="moderator-machine-type-reason">{messages.MACHINE_TYPE_REASON}
            <textarea id="moderator-machine-type-reason" value={typeReason} maxLength={1000} required rows={3} disabled={pending} onChange={(event) => setTypeReason(event.target.value)} />
          </label>
          <p className={adminStyles.panelSubtitle}>Nhập lý do để lưu lịch sử thay đổi loại thiết bị.</p>
          <div className={adminStyles.operationsButtons}>
            <button className={adminStyles.accountPrimaryButton} type="submit" disabled={pending || !machineType || !typeReason.trim()}>
              {updateType.isPending ? messages.MACHINE_SAVING : messages.MACHINE_TYPE_UPDATE}
            </button>
          </div>
        </form>
        <div className={adminStyles.machineManagementGroup}>
          <h3>Điều phối kỹ thuật viên</h3>
          {machine.ownerId ? <>
            <QueryFeedback query={technicians} loadingMessage={messages.MACHINE_LOADING_TECHNICIANS} />
            <label htmlFor="moderator-machine-technician">{messages.MACHINE_SELECT_TECHNICIAN}
              <select id="moderator-machine-technician" value={technicianId} disabled={pending || technicians.isPending} onChange={(event) => setTechnicianId(event.target.value)}>
                <option value="">{messages.MACHINE_SELECT_TECHNICIAN}</option>
                {technicians.data?.map((technician) => <option key={technician.idaasUserId} value={technician.idaasUserId}>{technician.fullName || technician.email || technician.idaasUserId}</option>)}
              </select>
            </label>
            <div className={adminStyles.operationsButtons}>
              <button className={adminStyles.accountPrimaryButton} type="button" disabled={!technicianId || pending} onClick={() => assign.mutate()}>{assign.isPending ? messages.MACHINE_SAVING : messages.MACHINE_TECHNICIAN_ASSIGN}</button>
              <button className={adminStyles.accountSecondaryButton} type="button" disabled={!technicianId || pending} onClick={() => unassign.mutate()}>{unassign.isPending ? messages.MACHINE_SAVING : messages.MACHINE_TECHNICIAN_UNASSIGN}</button>
            </div>
          </> : <p className={adminStyles.emptyText}>{messages.MACHINE_OWNER_ASSIGNMENT_REQUIRED}</p>}
        </div>
      </div>
      {error && <div className={`${adminStyles.notice} ${adminStyles.errorNotice}`} role="alert"><p>{error}</p></div>}
      {success && <p className={adminStyles.panelSubtitle} role="status">{success}</p>}
    </section>
  );
}

export function ModeratorMachineDetailScreen({ machineId }: { machineId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isPageVisible = usePageVisibility();
  const validId = MachineIdSchema.safeParse(machineId).success;
  const [detailTab, setDetailTab] = useState<"profile" | "machine-type">("profile");
  const [editing, setEditing] = useState(false);
  const [serialNumber, setSerialNumber] = useState("");
  const [region, setRegion] = useState("");
  const [locationId, setLocationId] = useState("");
  const [actionError, setActionError] = useState("");
  const machine = useQuery({
    queryKey: ["dolores", "machines", "id", machineId],
    queryFn: ({ signal }) => machinesApi.getById(machineId, signal),
    enabled: validId,
    retry: false,
  });
  const device = machine.data;
  const machineModelId = device?.modelId ?? "";
  const machineModel = useQuery({
    queryKey: ["dolores", "machine-models", "detail", machineModelId],
    queryFn: ({ signal }) => machineModelsApi.getById(machineModelId, signal),
    enabled: Boolean(device && detailTab === "machine-type" && machineModelId),
    retry: false,
  });
  const location = useQuery({
    queryKey: ["dolores", "locations", "id", device?.locationId],
    queryFn: ({ signal }) => locationsApi.getById(device!.locationId!, signal),
    enabled: Boolean(device?.locationId && LocationIdSchema.safeParse(device.locationId).success),
    retry: false,
  });
  const locations = useQuery({
    queryKey: ["dolores", "locations", "owner", device?.ownerId, "active"],
    queryFn: ({ signal }) => locationsApi.list({ ownerId: device!.ownerId!, activeOnly: true }, signal),
    enabled: editing && Boolean(device?.ownerId),
    retry: false,
  });
  const schedule = useQuery({
    queryKey: ["dolores", "machines", "maintenance-schedule", machineId],
    queryFn: ({ signal }) => machinesApi.getMaintenanceSchedule(machineId, signal),
    enabled: validId && Boolean(device),
    retry: false,
  });
  const tickets = useQuery({
    queryKey: ["dolores", "maintenance-tickets", { machineId }],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTickets({ machineId, page: 0, size: 100 }, signal),
    enabled: validId && Boolean(device),
    retry: false,
  });
  const heartbeat = useQuery({
    queryKey: ["dolores", "moderator", "telemetry", "heartbeat", machineId],
    queryFn: ({ signal }) => telemetryApi.getLatestHeartbeat(machineId, signal),
    enabled: validId && device?.machineType === "SMART_IOT" && isPageVisible,
    retry: false,
    refetchInterval: isPageVisible ? 5_000 : false,
    refetchIntervalInBackground: false,
  });
  const updateMachine = useMutation({
    mutationFn: (input: Parameters<typeof machinesApi.update>[1]) => machinesApi.update(machineId, input),
    onSuccess: async (updated) => {
      queryClient.setQueryData(["dolores", "machines", "id", machineId], updated);
      await queryClient.invalidateQueries({ queryKey: ["dolores", "machines"] });
      await queryClient.invalidateQueries({ queryKey: ["dolores", "locations"] });
      setEditing(false);
      setActionError("");
    },
    onError: (error: unknown) => setActionError(getApiErrorMessage(error, "mutation")),
  });
  const status = device?.status ? statusLabels[device.status] : "Chưa có trạng thái";
  const machineType = device?.machineType === "SMART_IOT"
    ? ADMIN_T.MACHINES.SMART
    : device?.machineType === "CONVENTIONAL" ? ADMIN_T.MACHINES.CONVENTIONAL : ADMIN_T.MACHINES.UNCLASSIFIED;
  const locationScopeMismatch = Boolean(device && location.data && device.ownerId && location.data.ownerId !== device.ownerId);
  const currentStatus = device?.status;
  const statusFilter = typeof router.query.status === "string" ? router.query.status : "";
  const listHref = `${PATH_MODERATOR.MACHINES}${statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ""}`;
  const back = { label: MODERATOR_MESSAGES.ACTION_BAR.BACK_TO_SECTION, fallbackHref: listHref };

  function beginEditing() {
    setDetailTab("profile");
    setSerialNumber(device?.serialNumber ?? "");
    setRegion(device?.region ?? "");
    setLocationId(device?.locationId ?? "");
    setActionError("");
    setEditing(true);
  }

  function submitMachineEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!device?.status || !serialNumber.trim()) return;
    updateMachine.mutate({
      serialNumber: serialNumber.trim(),
      status: device.status,
      ...(device.ownerId ? { ownerId: device.ownerId } : {}),
      ...(device.deployedAt ? { deployedAt: device.deployedAt } : {}),
      ...(device.nextPreventiveMaintenanceAt ? { nextPreventiveMaintenanceAt: device.nextPreventiveMaintenanceAt } : {}),
      ...(device.cupsServedSinceLastDescale != null ? { cupsServedSinceLastDescale: device.cupsServedSinceLastDescale } : {}),
      region,
      ...(locationId ? { locationId } : {}),
    });
  }

  const heading = (
    <BackButtonHeading
      title={device ? `${messages.MACHINE_DETAIL_TITLE} · ${device.serialNumber ?? device.id.slice(0, 8).toUpperCase()}` : messages.MACHINE_DETAIL_TITLE}
      titleId="moderator-machine-detail-title"
      description={device?.id ?? messages.MACHINES_DESCRIPTION}
      className={moderatorStyles.pageHeading}
      back={back}
    />
  );

  if (!validId) {
    return <div className={moderatorStyles.pageContent}>{heading}<p className={moderatorStyles.pendingNotice} role="alert">{messages.MACHINE_LEGACY_ID}</p></div>;
  }

  return (
    <div className={moderatorStyles.pageContent}>
      {heading}
      <QueryFeedback query={machine} loadingMessage={messages.LOADING_MACHINE} />
      {device && <>
        <MachineDetailView summary={[
          { label: ADMIN_T.MACHINES.STATUS, value: status },
          { label: ADMIN_T.MACHINES.MACHINE_TYPE, value: machineType },
          { label: ADMIN_T.MACHINES.CUPS, value: formatNumber(schedule.data?.cupsServedSinceLastDescale ?? device.cupsServedSinceLastDescale) },
          { label: ADMIN_T.MACHINES.NEXT_MAINTENANCE, value: formatDate(schedule.data?.nextPreventiveMaintenanceAt ?? device.nextPreventiveMaintenanceAt) },
        ]}>

        <div className={adminStyles.machineInventoryGroup}>
          <div className={adminStyles.machineViewTabs} role="tablist" aria-label="Chi tiết máy">
            <button id="moderator-machine-profile-tab" type="button" role="tab" aria-selected={detailTab === "profile"} aria-controls="moderator-machine-profile-panel" className={`${adminStyles.machineViewTab} ${detailTab === "profile" ? adminStyles.machineViewTabActive : ""}`} onClick={() => setDetailTab("profile")}>{ADMIN_T.MACHINES.DETAIL}</button>
            <button id="moderator-machine-type-tab" type="button" role="tab" aria-selected={detailTab === "machine-type"} aria-controls="moderator-machine-type-panel" className={`${adminStyles.machineViewTab} ${detailTab === "machine-type" ? adminStyles.machineViewTabActive : ""}`} disabled={editing} onClick={() => setDetailTab("machine-type")}>{ADMIN_T.MACHINES.MACHINE_TYPE}</button>
          </div>
          {detailTab === "profile" ? (
            <section id="moderator-machine-profile-panel" className={adminStyles.panel} role="tabpanel" aria-labelledby="moderator-machine-profile-tab">
              <div className={adminStyles.machineInventoryHeading}>
                <h2>{ADMIN_T.MACHINES.DETAIL}</h2>
                <Link className={adminStyles.accountSecondaryButton} href={PATH_MODERATOR.MACHINE_OPERATIONAL_OVERVIEW(machineId)}>
                  Xem dữ liệu vận hành
                </Link>
                {!editing && <button className={adminStyles.accountSecondaryButton} type="button" onClick={beginEditing}>{ADMIN_T.MACHINES.EDIT}</button>}
              </div>
              <div className={adminStyles.machineProfileGroups}>
                <section className={adminStyles.machineProfileGroup}>
                  <h3>Nhận diện máy</h3>
                  <div className={adminStyles.machineProfileFields}>
                    <Field label={ADMIN_T.MACHINES.MACHINE_ID} value={device.id} />
                    <Field label={ADMIN_T.MACHINES.SERIAL} value={device.serialNumber ?? "—"} />
                  </div>
                </section>
                <section className={adminStyles.machineProfileGroup}>
                  <h3>Phân bổ và hợp đồng</h3>
                  <div className={adminStyles.machineProfileFields}>
                    <Field label={ADMIN_T.MACHINES.OWNER_ID} value={device.ownerId ?? "—"} />
                    <Field label={ADMIN_T.MACHINES.TENANT_ID} value={device.tenantId ?? "—"} />
                    <Field label={ADMIN_T.MACHINES.OWNER_TYPE} value={device.ownerType ?? "—"} />
                    <Field label={ADMIN_T.MACHINES.REGION} value={device.region ?? "—"} />
                    <Field label={ADMIN_T.MACHINES.LOCATION} value={locationScopeMismatch ? device.locationId ?? "—" : location.data?.name ?? device.locationId ?? "—"} />
                    <Field label={ADMIN_T.MACHINES.LOCATION_ID} value={device.locationId ?? "—"} />
                    <Field label={ADMIN_T.MACHINES.DEPLOYED_AT} value={formatDate(device.deployedAt)} />
                    <Field label={ADMIN_T.MACHINES.CONTRACT_PERIOD} value={device.contractStartDate || device.contractEndDate ? `${formatDateOnly(device.contractStartDate)} – ${formatDateOnly(device.contractEndDate)}` : "—"} />
                    <Field label={ADMIN_T.MACHINES.MONTHLY_RENTAL_FEE} value={device.monthlyRentalFee == null ? "—" : `${formatNumber(device.monthlyRentalFee)} ₫/tháng`} />
                  </div>
                </section>
              </div>
              {device.locationId && locationScopeMismatch && <p className={moderatorStyles.partialNotice} role="note">{messages.LOCATION_MACHINE_SCOPE_MISMATCH}</p>}
              {device.locationId && !locationScopeMismatch && location.isError && <div className={`${adminStyles.notice} ${adminStyles.errorNotice}`} role="alert"><p>{getApiErrorMessage(location.error)}</p><button type="button" onClick={() => void location.refetch()}>{messages.RETRY}</button></div>}
              {editing && <form className={adminStyles.machineEditForm} onSubmit={submitMachineEdit}>
                <h3>{ADMIN_T.MACHINES.ALLOCATION_TITLE}</h3>
                <div className={adminStyles.machineEditFields}>
                  <label htmlFor="moderator-machine-serial">{ADMIN_T.MACHINES.SERIAL} *
                    <input id="moderator-machine-serial" required maxLength={160} value={serialNumber} disabled={updateMachine.isPending} onChange={(event) => setSerialNumber(event.target.value)} />
                  </label>
                  <label htmlFor="moderator-machine-region">{messages.MACHINE_REGION_UPDATE}
                    <input id="moderator-machine-region" value={region} disabled={updateMachine.isPending} onChange={(event) => setRegion(event.target.value)} />
                  </label>
                  <label htmlFor="moderator-machine-location">{messages.MACHINE_LOCATION_UPDATE}
                    <select id="moderator-machine-location" value={locationId} disabled={updateMachine.isPending || !device.ownerId || locations.isPending || locations.isError} onChange={(event) => setLocationId(event.target.value)}>
                      <option value="">{device.locationId ? "Giữ địa điểm hiện tại" : messages.MACHINE_SELECT_LOCATION}</option>
                      {device.locationId && !locations.data?.some((item) => item.id === device.locationId) && <option value={device.locationId}>{device.locationId}</option>}
                      {locations.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                </div>
                {device.ownerId && <QueryFeedback query={locations} loadingMessage={messages.MACHINE_LOADING_LOCATIONS} />}
                {!device.ownerId && <p className={adminStyles.panelSubtitle}>{ADMIN_T.MACHINES.OWNER_REQUIRED}</p>}
                {!currentStatus && <p className={adminStyles.accountInlineWarning} role="note">Không thể lưu vì API chưa trả về trạng thái hiện tại của máy.</p>}
                <div className={adminStyles.operationsButtons}>
                  <button className={adminStyles.accountPrimaryButton} type="submit" disabled={updateMachine.isPending || !serialNumber.trim() || !currentStatus}>{updateMachine.isPending ? messages.MACHINE_SAVING : ADMIN_T.MACHINES.SAVE_CHANGES}</button>
                  <button className={adminStyles.accountSecondaryButton} type="button" disabled={updateMachine.isPending} onClick={() => { setSerialNumber(device.serialNumber ?? ""); setRegion(device.region ?? ""); setLocationId(device.locationId ?? ""); setActionError(""); setEditing(false); }}>{ADMIN_T.MACHINES.CANCEL_EDIT}</button>
                </div>
              </form>}
              {actionError && <p className={adminStyles.accountInlineWarning} role="alert">{actionError}</p>}
            </section>
          ) : (
            <section id="moderator-machine-type-panel" className={adminStyles.panel} role="tabpanel" aria-labelledby="moderator-machine-type-tab">
              <h2>{ADMIN_T.MACHINES.MACHINE_TYPE}</h2>
              <div className={adminStyles.machineProfileFields}>
                <Field label={ADMIN_T.MACHINES.MACHINE_TYPE} value={machineType} />
                <Field label={ADMIN_T.MACHINES.TYPE_MAPPED_AT} value={formatDate(device.machineTypeMappedAt)} />
                <Field label={ADMIN_T.MACHINES.TYPE_MAPPED_BY} value={device.machineTypeMappedBy ?? "—"} />
                <Field label={ADMIN_T.MACHINES.TYPE_MAPPING_REASON} value={device.machineTypeMappingReason ?? "—"} />
                <Field label={ADMIN_T.MACHINE_MODELS.ID} value={machineModelId || ADMIN_T.MACHINES.MODEL_UNASSIGNED} />
                <Field label={ADMIN_T.MACHINES.MODEL_MAPPED_AT} value={formatDate(device.modelMappedAt)} />
                <Field label={ADMIN_T.MACHINES.MODEL_MAPPED_BY} value={device.modelMappedBy ?? "—"} />
                <Field label={ADMIN_T.MACHINES.MODEL_MAPPING_REASON} value={device.modelMappingReason ?? "—"} />
              </div>
              {machineModelId ? <>
                <QueryFeedback query={machineModel} loadingMessage={messages.LOADING_MACHINE} />
                {machineModel.data && <>
                  <h3>{ADMIN_T.MACHINE_MODELS.DETAIL}</h3>
                  <div className={adminStyles.machineProfileFields}>
                    <Field label={ADMIN_T.MACHINE_MODELS.MODEL_CODE} value={machineModel.data.modelCode} />
                    <Field label={ADMIN_T.MACHINE_MODELS.MANUFACTURER} value={machineModel.data.manufacturer} />
                    <Field label={ADMIN_T.MACHINE_MODELS.DISPLAY_NAME} value={machineModel.data.displayName} />
                    <Field label={ADMIN_T.MACHINES.MACHINE_TYPE} value={machineModel.data.machineType === "SMART_IOT" ? ADMIN_T.MACHINES.SMART : ADMIN_T.MACHINES.CONVENTIONAL} />
                    <Field label={ADMIN_T.MACHINE_MODELS.ACTIVE} value={machineModel.data.active ? ADMIN_T.MACHINE_MODELS.ACTIVE : ADMIN_T.MACHINE_MODELS.INACTIVE} />
                    <Field label={ADMIN_T.MACHINE_MODELS.CREATED_AT} value={formatDate(machineModel.data.createdAt)} />
                    <Field label={ADMIN_T.MACHINE_MODELS.UPDATED_AT} value={formatDate(machineModel.data.updatedAt)} />
                  </div>
                  <div className={adminStyles.machineModelSpecifications}>
                    <span>{ADMIN_T.MACHINE_MODELS.SPECIFICATIONS}</span>
                    {Object.keys(machineModel.data.specifications).length > 0 ? <pre>{JSON.stringify(machineModel.data.specifications, null, 2)}</pre> : <p>{ADMIN_T.MACHINE_MODELS.SPECIFICATIONS_EMPTY}</p>}
                  </div>
                </>}
              </> : <p className={adminStyles.emptyText}>{ADMIN_T.MACHINES.MODEL_UNLINKED}</p>}
            </section>
          )}
        </div>

        <section className={adminStyles.panel}>
          <h2>{ADMIN_T.MACHINES.PREVENTIVE}</h2>
          <QueryFeedback query={schedule} loadingMessage={messages.LOADING_MACHINE_SCHEDULE} />
          {schedule.data && !schedule.isError && <div className={adminStyles.machineProfileFields}>
            <Field label={ADMIN_T.MACHINES.NEXT_MAINTENANCE} value={formatDate(schedule.data.nextPreventiveMaintenanceAt)} />
            <Field label={ADMIN_T.MACHINES.CUPS} value={formatNumber(schedule.data.cupsServedSinceLastDescale)} />
          </div>}
        </section>

        <section className={adminStyles.panel}>
          <div className={adminStyles.machineInventoryHeading}>
            <h2>{ADMIN_T.MACHINES.TICKET_HISTORY}</h2>
            {tickets.data && <span>{formatNumber(tickets.data.length)} {ADMIN_T.MACHINES.TICKET_COUNT}</span>}
          </div>
          <QueryFeedback query={tickets} loadingMessage={messages.LOADING_MACHINE_TICKETS} />
          {tickets.data && !tickets.isError && tickets.data.length === 0 && <p className={adminStyles.emptyText}>{ADMIN_T.COMMON.EMPTY}</p>}
          {tickets.data && !tickets.isError && tickets.data.length > 0 && <MachineMaintenanceTicketTable tickets={tickets.data} machineId={machineId} />}
        </section>

        {device.machineType === "SMART_IOT" && <MachineHeartbeatPanel
          title={ADMIN_T.MACHINES.HEARTBEAT}
          heartbeat={heartbeat.data}
          loading={heartbeat.isPending}
          error={heartbeat.isError ? getApiErrorMessage(heartbeat.error) : undefined}
          onRetry={() => void heartbeat.refetch()}
          emptyMessage={ADMIN_T.COMMON.EMPTY}
          retryLabel={messages.RETRY}
        />}

        {device.machineType === "SMART_IOT" && <SmartIotPanel
          title={ADMIN_T.MACHINES.TELEMETRY}
          state="permission-denied"
          stateMessage="Swagger hiện chưa cấp quyền tra cứu Telemetry points cho Moderator."
        />}

        <MachineManagementActions key={device.id} machine={device} />
        </MachineDetailView>
      </>}
    </div>
  );
}
