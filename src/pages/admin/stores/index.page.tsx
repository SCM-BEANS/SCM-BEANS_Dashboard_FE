import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { adminUsersApi } from "@/apis/admin-users.api";
import { API_ERROR_MESSAGES, getApiErrorMessage, isUncertainApiMutation } from "@/lib/api-errors";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { DataTable } from "@/components/table/data-table";
import { ActionBar } from "@/components/action-bar/action-bar";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { locationsApi, LocationOwnerMismatchError } from "@/apis/locations.api";
import { profilesApi } from "@/apis/profiles.api";
import type { AdminUser } from "@/schema/admin-users.schema";
import { LocationIdSchema, type LocationCreate } from "@/schema/locations.schema";
import { ProfileIdSchema, type Profile } from "@/schema/profiles.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { AdminShell, adminStyles as styles } from "../admin-shell";
import { getStoresBackDestination } from "../admin-back-destination";

type OwnerLocations = { owners: Profile[]; locations: Array<{ owner: Profile; location: Awaited<ReturnType<typeof locationsApi.list>>[number] }>; failed: string[] };
type StoreForm = LocationCreate & { ownerId: string };
const emptyForm: StoreForm = { ownerId: "", name: "", address: "", city: "", contactPerson: "", phoneNumber: "" };
const queryValue = (value: string | string[] | undefined) => typeof value === "string" ? value : "";

async function loadOwners(signal?: AbortSignal): Promise<Profile[]> {
  const first = await profilesApi.list({ role: "OWNER", page: 0, size: 100 }, signal);
  const pages = [first];
  for (let index = 1; index < first.totalPages; index += 5) {
    const numbers = Array.from({ length: Math.min(5, first.totalPages - index) }, (_, offset) => index + offset);
    pages.push(...await Promise.all(numbers.map((page) => profilesApi.list({ role: "OWNER", page, size: 100 }, signal))));
    if (signal?.aborted) break;
  }
  return pages.flatMap((page) => page.items);
}

export async function loadOwnerUsers(signal?: AbortSignal): Promise<AdminUser[]> {
  const first = await adminUsersApi.list({ role: "owner", page: 1, page_size: 100 }, signal);
  const pages = [first];
  const totalPages = Math.ceil(first.total / first.page_size);
  for (let index = 2; index <= totalPages; index += 5) {
    const numbers = Array.from({ length: Math.min(5, totalPages - index + 1) }, (_, offset) => index + offset);
    pages.push(...await Promise.all(numbers.map((page) => adminUsersApi.list({ role: "owner", page, page_size: 100 }, signal))));
    if (signal?.aborted) break;
  }
  return pages.flatMap((page) => page.items);
}

export async function loadOwnerLocations(signal?: AbortSignal, selectedOwnerId?: string): Promise<OwnerLocations> {
  const allOwners = await loadOwners(signal);
  const owners = selectedOwnerId ? allOwners.filter((owner) => owner.idaasUserId === selectedOwnerId) : allOwners;
  const locations: OwnerLocations["locations"] = [];
  const failed: string[] = [];
  for (let index = 0; index < owners.length; index += 5) {
    const batch = owners.slice(index, index + 5);
    const results = await Promise.allSettled(batch.map((owner) => locationsApi.list({ ownerId: owner.idaasUserId }, signal)));
    results.forEach((result, position) => {
      const owner = batch[position];
      if (result.status === "rejected") { failed.push(owner.fullName || owner.idaasUserId); return; }
      for (const location of result.value) {
        const responseOwnerId = location.ownerId;
        if (responseOwnerId && responseOwnerId !== owner.idaasUserId) { failed.push(owner.fullName || owner.idaasUserId); continue; }
        locations.push({ owner, location });
      }
    });
    if (signal?.aborted) break;
  }
  return { owners, locations, failed };
}

function StoresContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const view = queryValue(router.query.view) || "list";
  const locationId = queryValue(router.query.id);
  const initialOwnerId = queryValue(router.query.ownerId);
  const [form, setForm] = useState<StoreForm>({ ...emptyForm, ownerId: initialOwnerId });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [blockResubmit, setBlockResubmit] = useState(false);
  const [createdStore, setCreatedStore] = useState<{ name: string; ownerName: string } | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const listing = useQuery({ queryKey: ["dolores", "admin-stores", initialOwnerId], queryFn: ({ signal }) => loadOwnerLocations(signal, initialOwnerId || undefined), enabled: view === "list" });
  const owners = useQuery({ queryKey: ["idaas", "admin-users", "owner-options"], queryFn: ({ signal }) => loadOwnerUsers(signal), enabled: view === "create" });
  const detail = useQuery({
    queryKey: ["dolores", "location", locationId],
    queryFn: ({ signal }) => locationsApi.getById(locationId, signal),
    enabled: (view === "detail" || view === "edit") && LocationIdSchema.safeParse(locationId).success,
  });
  const detailOwnerId = detail.data?.ownerId ?? initialOwnerId;
  const detailOwner = useQuery({
    queryKey: ["dolores", "profile", detailOwnerId],
    queryFn: ({ signal }) => profilesApi.getById(detailOwnerId, signal),
    enabled: (view === "detail" || view === "edit") && ProfileIdSchema.safeParse(detailOwnerId).success,
  });
  useEffect(() => {
    if (!detail.data) return;
    setForm({
      ownerId: detail.data.ownerId ?? "",
      name: detail.data.name,
      address: detail.data.address ?? "",
      city: detail.data.city ?? "",
      contactPerson: detail.data.contactPerson ?? "",
      phoneNumber: detail.data.phoneNumber ?? "",
    });
  }, [detail.data]);
  const create = useMutation({
    mutationFn: () => locationsApi.create(form.ownerId, {
      name: form.name, address: form.address || undefined, city: form.city || undefined,
      contactPerson: form.contactPerson || undefined, phoneNumber: form.phoneNumber || undefined,
    }),
    onSuccess: () => {
      setRequestError(""); setConfirmOpen(false);
      setCreatedStore({
        name: form.name.trim(),
        ownerName: owners.data?.find((owner) => owner.id === form.ownerId)?.name ?? form.ownerId,
      });
      setForm(emptyForm);
      void Promise.allSettled([queryClient.invalidateQueries({ queryKey: ["dolores", "admin-stores"] })]);
      void router.push({ pathname: "/admin/stores", query: initialOwnerId ? { ownerId: initialOwnerId } : {} }, undefined, { shallow: true });
    },
    onError: (error: unknown) => {
      if (error instanceof LocationOwnerMismatchError) {
        setBlockResubmit(true); setConfirmOpen(false);
        setRequestError(API_ERROR_MESSAGES.LOCATION_OWNER_MISMATCH);
        void queryClient.invalidateQueries({ queryKey: ["dolores", "admin-stores"] });
        return;
      }
      if (isUncertainApiMutation(error)) {
        setBlockResubmit(true); setConfirmOpen(false);
        setRequestError(getApiErrorMessage(error, "mutation"));
        void queryClient.invalidateQueries({ queryKey: ["dolores", "admin-stores"] });
        return;
      }
      setRequestError(getApiErrorMessage(error, "mutation"));
    },
  });
  const update = useMutation({
    mutationFn: () => locationsApi.update(locationId, {
      name: form.name,
      address: form.address || undefined,
      city: form.city || undefined,
      contactPerson: form.contactPerson || undefined,
      phoneNumber: form.phoneNumber || undefined,
    }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(["dolores", "location", locationId], updated);
      await queryClient.invalidateQueries({ queryKey: ["dolores", "admin-stores"] });
      setEditConfirmOpen(false);
      navigate({ view: "detail", id: locationId, ...(initialOwnerId ? { ownerId: initialOwnerId } : {}) });
    },
    onError: (error: unknown) => setRequestError(getApiErrorMessage(error, "mutation")),
  });
  const deactivate = useMutation({
    mutationFn: () => locationsApi.deactivate(locationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dolores", "admin-stores"] });
      setDeactivateConfirmOpen(false);
      navigate(initialOwnerId ? { ownerId: initialOwnerId } : undefined);
    },
    onError: (error: unknown) => setRequestError(getApiErrorMessage(error, "mutation")),
  });
  const navigate = (query?: Record<string, string>) => void router.push({ pathname: "/admin/stores", query }, undefined, { shallow: true });
  const submit = (event: FormEvent) => { event.preventDefault(); setRequestError(""); setConfirmOpen(true); };
  const setField = <K extends keyof StoreForm>(key: K, value: StoreForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const closeConfirmation = () => {
    setConfirmOpen(false);
    saveButtonRef.current?.focus();
  };
  const selectedOwner = detailOwner.data;
  const responseOwnerId = detail.data?.ownerId;
  const ownerMismatch = Boolean(initialOwnerId && responseOwnerId && initialOwnerId !== responseOwnerId);
  const title = view === "create" ? "Tạo cửa hàng" : view === "edit" ? "Chỉnh sửa cửa hàng" : view === "detail" ? detail.data?.name ?? T.STORES.DETAIL : T.STORES.TITLE;

  return <>
  <div className={`${styles.pageContent} ${view === "list" ? styles.accountPageContent : ""}`}>
    <BackButtonHeading
      title={title}
      titleId="admin-stores-title"
      description={T.STORES.DESCRIPTION}
      className={styles.pageHeading}
      back={getStoresBackDestination(router.query)}
    />
    {view === "list" && <div className={styles.pageActions}>
      <label>{T.STORES.OWNER}<select value={initialOwnerId} onChange={(event) => navigate(event.target.value ? { ownerId: event.target.value } : undefined)}>
        <option value="">{T.STORES.ALL_OWNERS}</option>{listing.data?.owners.map((owner) => <option key={owner.idaasUserId} value={owner.idaasUserId}>{owner.fullName}</option>)}
      </select></label>
    </div>}
    {view === "create" && <form id="store-create-form" className={styles.panel} onSubmit={submit}>
      <h2>Thông tin cửa hàng</h2>
      <div className={styles.operationsGrid}>
        <label>{T.STORES.NAME} *<input required maxLength={160} value={form.name} onChange={(event) => setField("name", event.target.value)} /></label>
        <label>{T.STORES.OWNER} *<select required value={form.ownerId} disabled={owners.isPending || owners.isError} onChange={(event) => setField("ownerId", event.target.value)}>
          <option value="">{owners.isPending ? T.COMMON.LOADING : "Chọn Owner"}</option>{owners.data?.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
        </select></label>
        <label>{T.STORES.ADDRESS}<input maxLength={500} value={form.address} onChange={(event) => setField("address", event.target.value)} /></label>
        <label>{T.STORES.CITY}<input maxLength={120} value={form.city} onChange={(event) => setField("city", event.target.value)} /></label>
        <label>{T.STORES.CONTACT}<input maxLength={160} value={form.contactPerson} onChange={(event) => setField("contactPerson", event.target.value)} /></label>
        <label>{T.STORES.PHONE}<input maxLength={40} value={form.phoneNumber} onChange={(event) => setField("phoneNumber", event.target.value)} /></label>
      </div>
      {owners.isError && <p className={styles.operationsNotice} role="alert">{getApiErrorMessage(owners.error)} Cần tải được Owner để tạo cửa hàng.</p>}
      {requestError && !confirmOpen && <p className={styles.operationsNotice} role="alert">{requestError}</p>}
    </form>}

    {view === "edit" && <>
      {detail.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
      {detail.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(detail.error)}</p><button type="button" onClick={() => void detail.refetch()}>{T.COMMON.RETRY}</button></div>}
      {detail.data && <form id="store-edit-form" className={styles.panel} onSubmit={(event) => { event.preventDefault(); setRequestError(""); setEditConfirmOpen(true); }}>
        <h2>Thông tin cửa hàng</h2>
        <div className={styles.operationsGrid}>
          <label>{T.STORES.NAME} *<input required maxLength={160} value={form.name} onChange={(event) => setField("name", event.target.value)} /></label>
          <label>{T.STORES.ADDRESS}<input maxLength={500} value={form.address} onChange={(event) => setField("address", event.target.value)} /></label>
          <label>{T.STORES.CITY}<input maxLength={120} value={form.city} onChange={(event) => setField("city", event.target.value)} /></label>
          <label>{T.STORES.CONTACT}<input maxLength={160} value={form.contactPerson} onChange={(event) => setField("contactPerson", event.target.value)} /></label>
          <label>{T.STORES.PHONE}<input maxLength={40} value={form.phoneNumber} onChange={(event) => setField("phoneNumber", event.target.value)} /></label>
        </div>
        {requestError && <p className={styles.operationsNotice} role="alert">{requestError}</p>}
        {update.isError && <p className={styles.operationsNotice} role="alert">{getApiErrorMessage(update.error, "mutation")}</p>}
      </form>}
    </>}

    {view === "detail" && <>
      {!LocationIdSchema.safeParse(locationId).success && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">Mã cửa hàng không hợp lệ.</div>}
      {detail.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
      {detail.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(detail.error)}</p><button type="button" onClick={() => void detail.refetch()}>{T.COMMON.RETRY}</button></div>}
      {ownerMismatch && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">Owner trong liên kết không khớp Owner do Dolores trả về. Không hiển thị hồ sơ để tránh gán nhầm.</div>}
      {detail.data && !ownerMismatch && <section className={styles.panel}><h2>{T.STORES.DETAIL}</h2><div className={styles.operationsGrid}>
        <div><span>{T.STORES.NAME}</span><strong>{detail.data.name}</strong></div>
        <div><span>{T.STORES.OWNER}</span><strong>{selectedOwner?.fullName ?? (detail.data.ownerId ?? "—")}</strong></div>
        <div><span>{T.STORES.ADDRESS}</span><strong>{detail.data.address || "—"}</strong></div>
        <div><span>{T.STORES.CITY}</span><strong>{detail.data.city || "—"}</strong></div>
        <div><span>{T.STORES.CONTACT}</span><strong>{detail.data.contactPerson || "—"}</strong></div>
        <div><span>{T.STORES.PHONE}</span><strong>{detail.data.phoneNumber || "—"}</strong></div>
        <div><span>Trạng thái</span><strong>{detail.data.active == null ? "—" : detail.data.active ? T.STORES.ACTIVE : T.STORES.INACTIVE}</strong></div>
        <div><span>Mã cửa hàng</span><strong>{detail.data.id}</strong></div>
      </div></section>}
    </>}

    {view === "list" && <>
      {listing.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
      {listing.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(listing.error)}</p><button type="button" onClick={() => void listing.refetch()}>{T.COMMON.RETRY}</button></div>}
      {listing.data && <>
        {listing.data.failed.length > 0 && <div className={styles.operationsNotice} role="status">{T.STORES.PARTIAL} {listing.data.failed.join(", ")} <button type="button" onClick={() => void listing.refetch()}>{T.COMMON.RETRY}</button></div>}
        <section className={styles.panel}><h2>{listing.data.locations.length} cửa hàng</h2>
          {listing.data.locations.length === 0 ? <p className={styles.emptyText}>{T.COMMON.EMPTY}</p> : <DataTable
            headerVariant="admin"
            rows={listing.data.locations}
            rowKey={({ location }) => location.id}
            columns={[
              { key: "name", header: T.STORES.NAME, render: ({ location }) => location.name },
              { key: "owner", header: T.STORES.OWNER, render: ({ owner }) => owner.fullName },
              { key: "address", header: T.STORES.ADDRESS, render: ({ location }) => [location.address, location.city].filter(Boolean).join(", ") || "—" },
              { key: "status", header: "Trạng thái", render: ({ location }) => location.active == null ? "—" : location.active ? T.STORES.ACTIVE : T.STORES.INACTIVE },
              { key: "actions", header: "", render: ({ owner, location }) => (
                <button className={styles.accountTextButton} type="button" onClick={() => navigate({ view: "detail", id: location.id, ownerId: owner.idaasUserId })}>Chi tiết</button>
              ) },
            ]}
          />}
        </section>
      </>}
    </>}

    {confirmOpen && <NotificationDialog
      variant="confirm"
      title={T.STORES.CONFIRM_TITLE}
      description={`${form.name.trim()} \u00b7 ${owners.data?.find((owner) => owner.id === form.ownerId)?.name ?? form.ownerId}`}
      primaryAction={{
        label: create.isPending ? T.STORES.SAVING : T.STORES.CONFIRM,
        pending: create.isPending,
        disabled: blockResubmit || !ProfileIdSchema.safeParse(form.ownerId).success,
        onClick: () => { setRequestError(""); create.mutate(); },
      }}
      secondaryAction={{ label: T.STORES.CANCEL, onClick: closeConfirmation, disabled: create.isPending }}
      onClose={closeConfirmation}
      closeOnEscape={!create.isPending}
    >
      {requestError && <p className={styles.operationsNotice} role="alert">{requestError}</p>}
    </NotificationDialog>}
    {editConfirmOpen && <NotificationDialog
      variant="confirm"
      title="Xác nhận cập nhật cửa hàng"
      description={form.name.trim()}
      primaryAction={{ label: "Lưu thay đổi", pending: update.isPending, pendingLabel: "Đang lưu…", onClick: () => update.mutate() }}
      secondaryAction={{ label: T.STORES.CANCEL, disabled: update.isPending, onClick: () => setEditConfirmOpen(false) }}
      onClose={() => { if (!update.isPending) setEditConfirmOpen(false); }}
      closeOnEscape={!update.isPending}
    />}
    {deactivateConfirmOpen && <NotificationDialog
      variant="confirm"
      title="Ngừng hoạt động cửa hàng?"
      description="Thao tác này sẽ thu hồi máy đang gán tại cửa hàng."
      primaryAction={{ label: "Ngừng hoạt động", pending: deactivate.isPending, pendingLabel: "Đang cập nhật…", onClick: () => deactivate.mutate() }}
      secondaryAction={{ label: T.STORES.CANCEL, disabled: deactivate.isPending, onClick: () => setDeactivateConfirmOpen(false) }}
      onClose={() => { if (!deactivate.isPending) setDeactivateConfirmOpen(false); }}
      closeOnEscape={!deactivate.isPending}
    />}
    {createdStore && <NotificationDialog
      variant="success"
      title={T.STORES.CREATED}
      description={`${createdStore.name} \u00b7 ${createdStore.ownerName}`}
      primaryAction={{ label: T.STORES.CHECK_LIST, onClick: () => setCreatedStore(null) }}
      onClose={() => setCreatedStore(null)}
    />}
  </div>
  {view === "list" && (
    <ActionBar>
      <ButtonBar type="button" onClick={() => { setBlockResubmit(false); setRequestError(""); setForm({ ...emptyForm, ownerId: initialOwnerId }); navigate({ view: "create", ...(initialOwnerId ? { ownerId: initialOwnerId } : {}) }); }}>{T.STORES.CREATE}</ButtonBar>
    </ActionBar>
  )}
  {view === "create" && <ActionBar>
    <ButtonBar ref={saveButtonRef} type="submit" form="store-create-form" disabled={owners.isError || create.isPending || blockResubmit}>{T.STORES.SAVE}</ButtonBar>
  </ActionBar>}
  {view === "detail" && <ActionBar>
    <ButtonBar type="button" disabled={!detail.data || !detail.data.active} onClick={() => navigate({ view: "edit", id: locationId, ...(initialOwnerId ? { ownerId: initialOwnerId } : {}) })}>Chỉnh sửa</ButtonBar>
    <ButtonBar type="button" disabled={!detail.data || detail.data.active === false || deactivate.isPending} onClick={() => setDeactivateConfirmOpen(true)}>Ngừng hoạt động</ButtonBar>
  </ActionBar>}
  {view === "edit" && <ActionBar>
    <ButtonBar type="submit" form="store-edit-form" disabled={!detail.data || update.isPending}>Lưu thay đổi</ButtonBar>
    <ButtonBar type="button" onClick={() => navigate({ view: "detail", id: locationId, ...(initialOwnerId ? { ownerId: initialOwnerId } : {}) })}>Hủy</ButtonBar>
  </ActionBar>}
  </>;
}

export default function AdminStoresPage() { return <AdminShell><StoresContent /></AdminShell>; }
