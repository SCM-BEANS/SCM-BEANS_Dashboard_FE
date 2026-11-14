import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { adminUsersApi } from "@/apis/admin-users.api";
import { API_ERROR_MESSAGES, getApiErrorMessage, isUncertainApiMutation } from "@/lib/api-errors";
import { PageActionsRenderer } from "@/components/action-bar/page-actions-renderer";
import type { PageAction } from "@/components/action-bar/page-action.types";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { DataTable } from "@/components/table/data-table";
import { TableFilters } from "@/components/table/table-filters";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { locationsApi, LocationOwnerMismatchError } from "@/apis/locations.api";
import { profilesApi } from "@/apis/profiles.api";
import type { AdminUser } from "@/schema/admin-users.schema";
import { LocationIdSchema, type LocationCreate } from "@/schema/locations.schema";
import { LocationDetailPanel } from "@/components/features/locations/location-detail-panel";
import { PATH_ADMIN, PATH_MODERATOR } from "@/routes/path";
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

export async function loadOwnerLocations(signal?: AbortSignal): Promise<OwnerLocations> {
  const owners = await loadOwners(signal);
  const locations: OwnerLocations["locations"] = [];
  const failed: string[] = [];
  for (let index = 0; index < owners.length; index += 5) {
    const batch = owners.slice(index, index + 5);
    const results = await Promise.allSettled(batch.map(async (owner) => {
      const items: Awaited<ReturnType<typeof locationsApi.list>> = [];
      let page = 0;
      while (!signal?.aborted) {
        const result = await locationsApi.listPage({ ownerId: owner.idaasUserId, activeOnly: false, page, size: 100 }, signal);
        items.push(...result.items);
        if (!result.hasNext) break;
        if (result.page !== page) throw new Error("Dolores returned an unexpected location page index.");
        page += 1;
      }
      return items;
    }));
    results.forEach((result, position) => {
      const owner = batch[position];
      if (result.status === "rejected") { failed.push(owner.fullName || owner.idaasUserId); return; }
      for (const location of result.value) locations.push({ owner, location });
    });
    if (signal?.aborted) break;
  }
  return { owners, locations, failed };
}

export function StoresContent({ role = "ADMIN" }: { role?: "ADMIN" | "MODERATOR" }) {
  const storesPath = role === "ADMIN" ? PATH_ADMIN.STORES : PATH_MODERATOR.STORES;
  const storesKey = ["dolores", role.toLowerCase() + "-stores"];
  const router = useRouter();
  const queryClient = useQueryClient();
  const view = queryValue(router.query.view) || (queryValue(router.query.id) ? "detail" : "list");
  const locationId = queryValue(router.query.id);
  const initialOwnerId = queryValue(router.query.ownerId);
  const search = queryValue(router.query.q).trim().slice(0, 100);
  const storeStatus = queryValue(router.query.status);
  const [storePage, setStorePage] = useState(0);
  useEffect(() => setStorePage(0), [search, initialOwnerId, storeStatus]);
  const [searchDraft, setSearchDraft] = useState(search);
  useEffect(() => setSearchDraft(search), [search]);
  const [form, setForm] = useState<StoreForm>({ ...emptyForm, ownerId: initialOwnerId });
  const initializedEditLocationId = useRef("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [blockResubmit, setBlockResubmit] = useState(false);
  const [createdStore, setCreatedStore] = useState<{ name: string; ownerName: string } | null>(null);
  const listing = useQuery({ queryKey: storesKey, queryFn: ({ signal }) => loadOwnerLocations(signal), enabled: view === "list" });
  const owners = useQuery({ queryKey: ["dolores", role, "store-owner-options"], queryFn: async ({ signal }) => role === "ADMIN" ? loadOwnerUsers(signal) : (await loadOwners(signal)).map((owner) => ({ id: owner.idaasUserId, name: owner.fullName })), enabled: view === "create" });
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
    if (view !== "edit" || !detail.data || initializedEditLocationId.current === locationId) return;
    initializedEditLocationId.current = locationId;
    setForm({
      ownerId: detail.data.ownerId ?? initialOwnerId,
      name: detail.data.name,
      address: detail.data.address ?? "",
      city: detail.data.city ?? "",
      contactPerson: detail.data.contactPerson ?? "",
      phoneNumber: detail.data.phoneNumber ?? "",
    });
  }, [view, detail.data, initialOwnerId, locationId]);
  const navigate = (query?: Record<string, string>) => void router.push({ pathname: storesPath, query }, undefined, { shallow: true });
  const locationDetailHref = (id: string, ownerId: string) => {
    const query = new URLSearchParams({ view: "detail", id, ownerId });
    if (search) query.set("q", search);
    return `${storesPath}?${query.toString()}`;
  };
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
      void Promise.allSettled([queryClient.invalidateQueries({ queryKey: storesKey })]);
      void router.push({
        pathname: storesPath,
        query: { ...(initialOwnerId ? { ownerId: initialOwnerId } : {}), ...(search ? { q: search } : {}) },
      }, undefined, { shallow: true });
    },
    onError: (error: unknown) => {
      if (error instanceof LocationOwnerMismatchError) {
        setBlockResubmit(true); setConfirmOpen(false);
        setRequestError(API_ERROR_MESSAGES.LOCATION_OWNER_MISMATCH);
        void queryClient.invalidateQueries({ queryKey: storesKey });
        return;
      }
      if (isUncertainApiMutation(error)) {
        setBlockResubmit(true); setConfirmOpen(false);
        setRequestError(getApiErrorMessage(error, "mutation"));
        void queryClient.invalidateQueries({ queryKey: storesKey });
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
      setRequestError("");
      setBlockResubmit(false);
      queryClient.setQueryData(["dolores", "location", locationId], updated);
      await queryClient.invalidateQueries({ queryKey: storesKey });
      navigate({ view: "detail", id: locationId, ...(updated.ownerId ? { ownerId: updated.ownerId } : {}), ...(search ? { q: search } : {}) });
    },
    onError: (error: unknown) => {
      if (isUncertainApiMutation(error)) {
        setBlockResubmit(true);
        void queryClient.invalidateQueries({ queryKey: ["dolores", "location", locationId] });
        void queryClient.invalidateQueries({ queryKey: storesKey });
      }
      setRequestError(getApiErrorMessage(error, "mutation"));
    },
  });
  const updateFilters = (ownerId: string, query: string, status = storeStatus) => {
    const next: Record<string, string> = {};
    if (ownerId) next.ownerId = ownerId;
    if (query) next.q = query;
    if (status) next.status = status;
    navigate(Object.keys(next).length ? next : undefined);
  };
  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateFilters(initialOwnerId, searchDraft.trim().slice(0, 100));
  };
  const submit = (event: FormEvent) => { event.preventDefault(); setRequestError(""); setConfirmOpen(true); };
  const submitUpdate = (event: FormEvent) => {
    event.preventDefault();
    if (update.isPending || blockResubmit) return;
    setRequestError("");
    update.mutate();
  };
  const setField = <K extends keyof StoreForm>(key: K, value: StoreForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const closeConfirmation = () => {
    setConfirmOpen(false);
    document.querySelector<HTMLButtonElement>('[data-action-id="store-create-save"]')?.focus();
  };
  const beginEditing = () => {
    if (!detail.data) return;
    setForm({
      ownerId: detail.data.ownerId ?? initialOwnerId,
      name: detail.data.name,
      address: detail.data.address ?? "",
      city: detail.data.city ?? "",
      contactPerson: detail.data.contactPerson ?? "",
      phoneNumber: detail.data.phoneNumber ?? "",
    });
    setRequestError("");
    setBlockResubmit(false);
    navigate({ view: "edit", id: detail.data.id, ...(detail.data.ownerId ? { ownerId: detail.data.ownerId } : {}), ...(search ? { q: search } : {}) });
  };
  const returnToStoreDetail = () => navigate({ view: "detail", id: locationId, ...(detail.data?.ownerId ? { ownerId: detail.data.ownerId } : {}), ...(search ? { q: search } : {}) });
  const selectedOwner = detailOwner.data;
  const responseOwnerId = detail.data?.ownerId;
  const ownerMismatch = Boolean(initialOwnerId && responseOwnerId && initialOwnerId !== responseOwnerId);
  const createFormDirty = JSON.stringify(form) !== JSON.stringify({ ...emptyForm, ownerId: initialOwnerId });
  const editFormDirty = Boolean(detail.data && (
    form.name !== detail.data.name
    || form.address !== (detail.data.address ?? "")
    || form.city !== (detail.data.city ?? "")
    || form.contactPerson !== (detail.data.contactPerson ?? "")
    || form.phoneNumber !== (detail.data.phoneNumber ?? "")
  ));
  const createDisabledReason = create.isPending
    ? "Đang tạo cửa hàng."
    : blockResubmit
      ? "Kiểm tra danh sách trước khi gửi lại."
      : owners.isPending
        ? "Đang tải danh sách khách hàng."
        : owners.isError
          ? "Không thể tải danh sách khách hàng."
          : !form.name.trim()
            ? "Nhập tên cửa hàng trước khi lưu."
            : !ProfileIdSchema.safeParse(form.ownerId).success
              ? "Chọn khách hàng trước khi lưu."
              : undefined;
  const editDisabledReason = update.isPending
    ? "Đang lưu thay đổi cửa hàng."
    : blockResubmit
      ? "Kiểm tra chi tiết cửa hàng trước khi gửi lại."
      : !form.name.trim()
        ? "Nhập tên cửa hàng trước khi lưu."
        : undefined;
  const normalizedSearch = search.toLocaleLowerCase("vi-VN");
  const visibleLocations = listing.data?.locations.filter(({ owner, location }) => {
    if (initialOwnerId && owner.idaasUserId !== initialOwnerId) return false;
    if (storeStatus === "ACTIVE" && location.active !== true) return false;
    if (storeStatus === "INACTIVE" && location.active !== false) return false;
    if (!normalizedSearch) return true;
    return [location.name, location.address, location.city, owner.fullName]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase("vi-VN").includes(normalizedSearch) ?? false);
  }) ?? [];
  const currentStorePage = Math.min(storePage, Math.max(0, Math.ceil(visibleLocations.length / 10) - 1));
  const title = view === "create" ? "Tạo cửa hàng" : view === "edit" ? "Chỉnh sửa cửa hàng" : view === "detail" ? detail.data?.name ?? T.STORES.DETAIL : T.STORES.TITLE;

  const actions: readonly PageAction[] = view === "list" ? [
    {
      id: "store-create-open",
      label: T.STORES.CREATE,
      variant: "primary",
      priority: 20,
      onClick: () => { setBlockResubmit(false); setRequestError(""); setForm({ ...emptyForm, ownerId: initialOwnerId }); navigate({ view: "create", ...(initialOwnerId ? { ownerId: initialOwnerId } : {}), ...(search ? { q: search } : {}) }); },
    },
  ] : view === "create" ? [
    {
      id: "store-create-cancel",
      label: T.STORES.CANCEL,
      variant: "secondary",
      priority: 100,
      disabled: create.isPending,
      disabledReason: create.isPending ? "Đang tạo cửa hàng." : undefined,
      onClick: () => navigate({ ...(initialOwnerId ? { ownerId: initialOwnerId } : {}), ...(search ? { q: search } : {}) }),
      confirm: createFormDirty ? { title: "Hủy tạo cửa hàng?", description: "Thông tin cửa hàng chưa lưu sẽ bị mất.", confirmLabel: "Hủy" } : undefined,
    },
    {
      id: "store-create-save",
      label: create.isPending ? T.STORES.SAVING : "Lưu",
      variant: "primary",
      priority: 100,
      type: "submit",
      form: "store-create-form",
      disabled: Boolean(createDisabledReason) || confirmOpen,
      disabledReason: createDisabledReason ?? (confirmOpen ? "Xác nhận việc tạo cửa hàng trước khi tiếp tục." : undefined),
      pending: create.isPending,
      pendingLabel: T.STORES.SAVING,
    },
  ] : view === "edit" ? [
    {
      id: "store-edit-cancel",
      label: T.STORES.CANCEL,
      variant: "secondary",
      priority: 100,
      disabled: update.isPending,
      disabledReason: update.isPending ? "Đang lưu thay đổi cửa hàng." : undefined,
      onClick: returnToStoreDetail,
      confirm: editFormDirty ? { title: "Hủy chỉnh sửa cửa hàng?", description: "Các thay đổi chưa lưu sẽ bị mất.", confirmLabel: "Hủy" } : undefined,
    },
    {
      id: "store-edit-save",
      label: update.isPending ? T.STORES.SAVING : "Lưu thay đổi",
      variant: "primary",
      priority: 100,
      type: "submit",
      form: "store-edit-form",
      disabled: Boolean(editDisabledReason) || !editFormDirty,
      disabledReason: editDisabledReason,
      pending: update.isPending,
      pendingLabel: T.STORES.SAVING,
    },
  ] : view === "detail" && detail.data && !ownerMismatch ? [
    { id: "store-edit-open", label: "Chỉnh sửa", variant: "primary", priority: 10, onClick: beginEditing },
  ] : [];
  return <>
  <div className={`${styles.pageContent} ${styles.userPage}`}>
    <div className={`${styles.pageHeading} ${styles.userPageHeading}`}><BackButtonHeading
      title={title}
      titleId="admin-stores-title"
      description={view === "list" || view === "create" ? "Quản lý cửa hàng và thông tin liên hệ của khách hàng." : undefined}
      className={styles.pageHeading}
      back={view === "edit" && locationId ? {
        label: "Về chi tiết",
        fallbackHref: `${storesPath}?view=detail&id=${encodeURIComponent(locationId)}${responseOwnerId ? `&ownerId=${encodeURIComponent(responseOwnerId)}` : ""}${search ? `&q=${encodeURIComponent(search)}` : ""}`,
      } : getStoresBackDestination(router.query, storesPath)}
    />
    {(view === "list" || view === "detail") && <PageActionsRenderer actions={actions} />}</div>
    {view === "create" && <form id="store-create-form" className={styles.panel} onSubmit={submit}>
      <h2>Thông tin cửa hàng</h2>
      <div className={styles.operationsGrid}>
        <label>{T.STORES.NAME} *<input required maxLength={160} value={form.name} onChange={(event) => setField("name", event.target.value)} /></label>
        <label>{T.STORES.OWNER} *<select required value={form.ownerId} disabled={owners.isPending || owners.isError} onChange={(event) => setField("ownerId", event.target.value)}>
          <option value="">{owners.isPending ? T.COMMON.LOADING : "Chọn khách hàng"}</option>{owners.data?.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
        </select></label>
        <label>{T.STORES.ADDRESS}<input maxLength={500} value={form.address} onChange={(event) => setField("address", event.target.value)} /></label>
        <label>{T.STORES.CITY}<input maxLength={120} value={form.city} onChange={(event) => setField("city", event.target.value)} /></label>
        <label>{T.STORES.CONTACT}<input maxLength={160} value={form.contactPerson} onChange={(event) => setField("contactPerson", event.target.value)} /></label>
        <label>{T.STORES.PHONE}<input maxLength={40} value={form.phoneNumber} onChange={(event) => setField("phoneNumber", event.target.value)} /></label>
      </div>
      {owners.isError && <p className={styles.operationsNotice} role="alert">{getApiErrorMessage(owners.error)} Cần tải được danh sách khách hàng để tạo cửa hàng.</p>}
      {requestError && !confirmOpen && <p className={styles.operationsNotice} role="alert">{requestError}</p>}
    </form>}

    {view === "edit" && detail.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
    {view === "edit" && detail.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(detail.error)}</p><button type="button" onClick={() => void detail.refetch()}>{T.COMMON.RETRY}</button></div>}
    {view === "edit" && ownerMismatch && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">Owner trong liên kết không khớp Owner do Dolores trả về. Không hiển thị hồ sơ để tránh gán nhầm.</div>}
    {view === "edit" && detail.data && !ownerMismatch && <div className={styles.storeLayout}>
      <form id="store-edit-form" className={`${styles.panel} ${styles.storeForm}`} onSubmit={submitUpdate}>
        <h2>Thông tin cửa hàng</h2>
        <fieldset disabled={update.isPending || blockResubmit}>
          <label className={styles.storeField}>{T.STORES.NAME} *<input required maxLength={160} value={form.name} onChange={(event) => setField("name", event.target.value)} /></label>
          <div className={styles.storeAddressFields}>
            <label className={styles.storeField}>{T.STORES.ADDRESS}<input maxLength={500} value={form.address} onChange={(event) => setField("address", event.target.value)} /></label>
            <label className={styles.storeField}>{T.STORES.CITY}<input maxLength={120} value={form.city} onChange={(event) => setField("city", event.target.value)} /></label>
          </div>
          <h3>Thông tin liên hệ</h3>
          <div className={styles.operationsGrid}>
            <label>{T.STORES.CONTACT}<input maxLength={160} value={form.contactPerson} onChange={(event) => setField("contactPerson", event.target.value)} /></label>
            <label>{T.STORES.PHONE}<input type="tel" maxLength={40} value={form.phoneNumber} onChange={(event) => setField("phoneNumber", event.target.value)} /></label>
          </div>
        </fieldset>
        {requestError && <p className={styles.operationsNotice} role="alert">{requestError}</p>}
        <div className={styles.userInlineActions}><PageActionsRenderer actions={actions} /></div>
      </form>
      <aside className={`${styles.panel} ${styles.storeOwner}`}><h2>Khách hàng phụ trách</h2><strong>{selectedOwner?.fullName ?? <TruncatedId value={detail.data.ownerId} />}</strong><dl><div><dt>Mã cửa hàng</dt><dd><TruncatedId value={detail.data.id} /></dd></div></dl></aside>
    </div>}


    {view === "detail" && <>
      {!LocationIdSchema.safeParse(locationId).success && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">Mã cửa hàng không hợp lệ.</div>}
      {detail.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
      {detail.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(detail.error)}</p><button type="button" onClick={() => void detail.refetch()}>{T.COMMON.RETRY}</button></div>}
      {ownerMismatch && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">Owner trong liên kết không khớp Owner do Dolores trả về. Không hiển thị hồ sơ để tránh gán nhầm.</div>}
      {detail.data && !ownerMismatch && <>
        <div className={styles.storeLayout}>
          <section className={`${styles.panel} ${styles.storeInfo}`}><h2>Thông tin cửa hàng</h2>
            <dl className={styles.storeInfoGrid}>
              <div className={styles.storeFullRow}><dt>Địa chỉ</dt><dd>{[detail.data.address, detail.data.city].filter(Boolean).join(", ") || "—"}</dd></div>
              <div><dt>Người liên hệ</dt><dd>{detail.data.contactPerson || "—"}</dd></div>
              <div><dt>Số điện thoại</dt><dd>{detail.data.phoneNumber || "—"}</dd></div>
            </dl>
          </section>
          <aside className={`${styles.panel} ${styles.storeOwner}`}><h2>Khách hàng phụ trách</h2><strong>{selectedOwner?.fullName ?? <TruncatedId value={detail.data.ownerId} />}</strong>
            <dl><div><dt>Trạng thái cửa hàng</dt><dd>{detail.data.active == null ? "—" : <span className={styles.userStatus} data-status={detail.data.active ? "ACTIVE" : "INACTIVE"}>{detail.data.active ? T.STORES.ACTIVE : T.STORES.INACTIVE}</span>}</dd></div><div><dt>Mã cửa hàng</dt><dd><TruncatedId value={detail.data.id} /></dd></div></dl>
          </aside>
        </div>
        <LocationDetailPanel
          locationId={detail.data.id}
          machineDetailHref={(machineId) => (role === "ADMIN" ? PATH_ADMIN : PATH_MODERATOR).MACHINE_DETAIL(machineId)}
          tableVariant={role === "ADMIN" ? "operations" : "moderator"}
          compact
        />
      </>}
    </>}

    {view === "list" && <section className={`${styles.panel} ${styles.userListPanel}`}>
      <div className={styles.userSectionHeading}><h2>{T.STORES.LIST_TITLE}</h2>{listing.data && <span>{visibleLocations.length} cửa hàng</span>}</div>
      <TableFilters
        search={{
          ariaLabel: T.STORES.SEARCH_LABEL,
          maxLength: 100,
          placeholder: T.STORES.SEARCH_PLACEHOLDER,
          value: searchDraft,
          onChange: setSearchDraft,
        }}
        selects={[{
          id: "store-status-filter", ariaLabel: "Trạng thái cửa hàng", value: storeStatus,
          options: [{ value: "", label: "Tất cả trạng thái" }, { value: "ACTIVE", label: "Hoạt động" }, { value: "INACTIVE", label: "Ngừng hoạt động" }],
          onChange: (status) => updateFilters(initialOwnerId, search, status),
        }, {
          id: "store-owner-filter",
          ariaLabel: T.STORES.OWNER,
          value: initialOwnerId,
          options: [
            { value: "", label: T.STORES.ALL_OWNERS },
            ...(listing.data?.owners ?? []).map((owner) => ({ value: owner.idaasUserId, label: owner.fullName })),
          ],
          onChange: (ownerId) => updateFilters(ownerId, search),
        }]}
        submitLabel={T.STORES.SEARCH_BUTTON}
        onSubmit={submitFilters}
      />
      {listing.isPending && <p role="status">{T.COMMON.LOADING}</p>}
      {listing.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(listing.error)}</p><button type="button" onClick={() => void listing.refetch()}>{T.COMMON.RETRY}</button></div>}
      {listing.data && <>
        {listing.data.failed.length > 0 && <div className={styles.operationsNotice} role="status">{T.STORES.PARTIAL} {listing.data.failed.join(", ")} <button type="button" onClick={() => void listing.refetch()}>{T.COMMON.RETRY}</button></div>}
        {visibleLocations.length === 0 ? <p className={styles.emptyText}>{search || initialOwnerId ? T.STORES.NO_MATCH : T.COMMON.EMPTY}</p> : <DataTable
          variant="accounts"
          rows={visibleLocations.slice(currentStorePage * 10, currentStorePage * 10 + 10)}
          rowKey={({ location }) => location.id}
          columns={[
            { key: "name", header: T.STORES.NAME, render: ({ location }) => (
              <strong>{location.name}</strong>
            ) },
            { key: "owner", header: T.STORES.OWNER, render: ({ owner }) => owner.fullName },
            { key: "address", header: T.STORES.ADDRESS, render: ({ location }) => [location.address, location.city].filter(Boolean).join(", ") || "—" },
            { key: "status", header: "Trạng thái", render: ({ location }) => location.active == null ? "—" : <span className={styles.userStatus} data-status={location.active ? "ACTIVE" : "INACTIVE"}>{location.active ? T.STORES.ACTIVE : T.STORES.INACTIVE}</span> },
            { key: "open", header: "", render: ({ owner, location }) => <ButtonBar rollingLabel href={locationDetailHref(location.id, owner.idaasUserId)}>Mở hồ sơ</ButtonBar> },
          ]}
        />}
      </>}
    </section>}

    {view === "list" && visibleLocations.length > 0 && <nav className={styles.userInlineActions} aria-label="Phân trang cửa hàng"><ButtonBar disabled={currentStorePage === 0} onClick={() => setStorePage(currentStorePage - 1)}>Trước</ButtonBar><span>Trang {currentStorePage + 1}/{Math.max(1, Math.ceil(visibleLocations.length / 10))}</span><ButtonBar disabled={(currentStorePage + 1) * 10 >= visibleLocations.length} onClick={() => setStorePage(currentStorePage + 1)}>Sau</ButtonBar></nav>}
    {view === "create" && <div className={styles.userInlineActions}><PageActionsRenderer actions={actions} /></div>}
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
    {createdStore && <NotificationDialog
      variant="success"
      title={T.STORES.CREATED}
      description={`${createdStore.name} \u00b7 ${createdStore.ownerName}`}
      primaryAction={{ label: T.STORES.CHECK_LIST, onClick: () => setCreatedStore(null) }}
      onClose={() => setCreatedStore(null)}
    />}
  </div>

  </>;
}

export default function AdminStoresPage() { return <AdminShell><StoresContent /></AdminShell>; }
