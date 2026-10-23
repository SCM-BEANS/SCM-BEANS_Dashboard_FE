import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { adminUsersApi } from "@/apis/admin-users.api";
import { ButtonBar } from "@/components/button/button-bar";
import { AdminActionBar } from "@/components/action-bar/admin-action-bar";
import { locationsApi, LocationOwnerMismatchError } from "@/apis/locations.api";
import { profilesApi } from "@/apis/profiles.api";
import type { AdminUser } from "@/schema/admin-users.schema";
import { LocationIdSchema, type LocationCreate } from "@/schema/locations.schema";
import { ProfileIdSchema, type Profile } from "@/schema/profiles.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { AdminShell, adminStyles as styles } from "./admin-shell";

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

function errorText(error: unknown): string {
  if (error instanceof z.ZodError) return T.COMMON.INVALID;
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) return T.COMMON.FORBIDDEN;
    if (error.response?.status === 404) return "Không tìm thấy cửa hàng này.";
    if (error.response?.status === 400 || error.response?.status === 422) return "Thông tin cửa hàng chưa hợp lệ. Kiểm tra các trường rồi thử lại.";
    if (error.response?.status === 409) return "Cửa hàng đang xung đột với dữ liệu hiện tại. Tải lại danh sách trước khi thử lại.";
    if (error.response?.status === 502 || !error.response) return T.STORES.UNCERTAIN_RESULT;
  }
  return T.COMMON.ERROR;
}

function StoresContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const view = queryValue(router.query.view) || "list";
  const locationId = queryValue(router.query.id);
  const initialOwnerId = queryValue(router.query.ownerId);
  const [form, setForm] = useState<StoreForm>({ ...emptyForm, ownerId: initialOwnerId });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [blockResubmit, setBlockResubmit] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const listing = useQuery({ queryKey: ["dolores", "admin-stores", initialOwnerId], queryFn: ({ signal }) => loadOwnerLocations(signal, initialOwnerId || undefined), enabled: view === "list" });
  const owners = useQuery({ queryKey: ["idaas", "admin-users", "owner-options"], queryFn: ({ signal }) => loadOwnerUsers(signal), enabled: view === "create" });
  const detail = useQuery({
    queryKey: ["dolores", "location", locationId],
    queryFn: ({ signal }) => locationsApi.getById(locationId, signal),
    enabled: view === "detail" && LocationIdSchema.safeParse(locationId).success,
  });
  const detailOwnerId = detail.data?.ownerId ?? initialOwnerId;
  const detailOwner = useQuery({
    queryKey: ["dolores", "profile", detailOwnerId],
    queryFn: ({ signal }) => profilesApi.getById(detailOwnerId, signal),
    enabled: view === "detail" && ProfileIdSchema.safeParse(detailOwnerId).success,
  });
  const create = useMutation({
    mutationFn: () => locationsApi.create(form.ownerId, {
      name: form.name, address: form.address || undefined, city: form.city || undefined,
      contactPerson: form.contactPerson || undefined, phoneNumber: form.phoneNumber || undefined,
    }),
    onSuccess: async () => {
      setRequestError(""); setConfirmOpen(false); setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ["dolores", "admin-stores"] });
      void router.push({ pathname: "/admin/stores", query: initialOwnerId ? { ownerId: initialOwnerId } : {} }, undefined, { shallow: true });
    },
    onError: (error: unknown) => {
      if (error instanceof LocationOwnerMismatchError) {
        setBlockResubmit(true); setConfirmOpen(false);
        setRequestError(T.STORES.OWNER_MISMATCH);
        void queryClient.invalidateQueries({ queryKey: ["dolores", "admin-stores"] });
        return;
      }
      if (axios.isAxiosError(error) && (!error.response || error.response.status >= 500)) {
        setBlockResubmit(true); setConfirmOpen(false);
        setRequestError(T.STORES.UNCERTAIN_RESULT);
        void queryClient.invalidateQueries({ queryKey: ["dolores", "admin-stores"] });
        return;
      }
      setRequestError(errorText(error));
    },
  });
  const navigate = (query?: Record<string, string>) => void router.push({ pathname: "/admin/stores", query }, undefined, { shallow: true });
  const submit = (event: FormEvent) => { event.preventDefault(); setRequestError(""); setConfirmOpen(true); };
  const setField = <K extends keyof StoreForm>(key: K, value: StoreForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (!confirmOpen) return;
    dialogRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus();
  }, [confirmOpen]);
  const closeConfirmation = () => {
    setConfirmOpen(false);
    saveButtonRef.current?.focus();
  };
  const selectedOwner = detailOwner.data;
  const responseOwnerId = detail.data?.ownerId;
  const ownerMismatch = Boolean(initialOwnerId && responseOwnerId && initialOwnerId !== responseOwnerId);
  const title = view === "create" ? "Tạo cửa hàng" : view === "detail" ? detail.data?.name ?? T.STORES.DETAIL : T.STORES.TITLE;

  return <>
  <div className={`${styles.pageContent} ${view === "list" ? styles.accountPageContent : ""}`}>
    <div className={styles.pageHeading}><h1>{title}</h1><p>{T.STORES.DESCRIPTION}</p></div>
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
      {owners.isError && <p className={styles.operationsNotice} role="alert">{errorText(owners.error)} Cần tải được Owner để tạo cửa hàng.</p>}
      {requestError && <p className={styles.operationsNotice} role="alert">{requestError}</p>}
      {blockResubmit && <div className={styles.operationsButtons}><button className={styles.accountSecondaryButton} type="button" onClick={() => navigate()}>{T.STORES.CHECK_LIST}</button></div>}
    </form>}

    {view === "detail" && <>
      {!LocationIdSchema.safeParse(locationId).success && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">Mã cửa hàng không hợp lệ.</div>}
      {detail.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
      {detail.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{errorText(detail.error)}</p><button type="button" onClick={() => void detail.refetch()}>{T.COMMON.RETRY}</button></div>}
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

    {view !== "detail" && view !== "create" && <>
      {listing.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
      {listing.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{errorText(listing.error)}</p><button type="button" onClick={() => void listing.refetch()}>{T.COMMON.RETRY}</button></div>}
      {listing.data && <>
        {listing.data.failed.length > 0 && <div className={styles.operationsNotice} role="status">{T.STORES.PARTIAL} {listing.data.failed.join(", ")} <button type="button" onClick={() => void listing.refetch()}>{T.COMMON.RETRY}</button></div>}
        <section className={styles.panel}><h2>{listing.data.locations.length} cửa hàng</h2>
          {listing.data.locations.length === 0 ? <p className={styles.emptyText}>{T.COMMON.EMPTY}</p> : <div className={styles.tableScroll}><table className={styles.operationsTable}>
            <thead><tr><th>{T.STORES.NAME}</th><th>{T.STORES.OWNER}</th><th>{T.STORES.ADDRESS}</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>{listing.data.locations.map(({ owner, location }) => <tr key={location.id}>
              <td>{location.name}</td><td>{owner.fullName}</td><td>{[location.address, location.city].filter(Boolean).join(", ") || "—"}</td>
              <td>{location.active == null ? "—" : location.active ? T.STORES.ACTIVE : T.STORES.INACTIVE}</td>
              <td><button className={styles.accountTextButton} type="button" onClick={() => navigate({ view: "detail", id: location.id, ownerId: owner.idaasUserId })}>Chi tiết</button></td>
            </tr>)}</tbody>
          </table></div>}
        </section>
      </>}
    </>}

    {confirmOpen && <div className={styles.operationsDialogBackdrop} role="presentation"><section ref={dialogRef} className={styles.operationsDialog} role="dialog" aria-modal="true" aria-labelledby="store-confirm-title" tabIndex={-1} onKeyDown={(event) => {
      if (event.key === "Escape" && !create.isPending) { closeConfirmation(); return; }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}>
      <h2 id="store-confirm-title">{T.STORES.CONFIRM_TITLE}</h2><p>{form.name.trim()} · {owners.data?.find((owner) => owner.id === form.ownerId)?.name}</p>
      {requestError && <p className={styles.operationsNotice} role="alert">{requestError}</p>}
      <div className={styles.operationsButtons}><button className={styles.accountPrimaryButton} type="button" disabled={create.isPending || blockResubmit || !ProfileIdSchema.safeParse(form.ownerId).success} onClick={() => create.mutate()}>{create.isPending ? T.STORES.SAVING : T.STORES.CONFIRM}</button><button className={styles.accountSecondaryButton} type="button" disabled={create.isPending} onClick={closeConfirmation}>{T.STORES.CANCEL}</button></div>
    </section></div>}
  </div>
  {view === "list" && (
    <AdminActionBar>
      <ButtonBar type="button" onClick={() => { setBlockResubmit(false); setRequestError(""); setForm({ ...emptyForm, ownerId: initialOwnerId }); navigate({ view: "create", ...(initialOwnerId ? { ownerId: initialOwnerId } : {}) }); }}>{T.STORES.CREATE}</ButtonBar>
    </AdminActionBar>
  )}
  {view === "create" && <AdminActionBar>
    <ButtonBar ref={saveButtonRef} type="submit" form="store-create-form" disabled={owners.isError || create.isPending || blockResubmit}>{T.STORES.SAVE}</ButtonBar>
    <ButtonBar type="button" onClick={() => navigate()}>{T.STORES.CANCEL}</ButtonBar>
  </AdminActionBar>}
  {view === "detail" && <AdminActionBar>
    <ButtonBar type="button" onClick={() => navigate()}>Về danh sách</ButtonBar>
    <ButtonBar type="button" disabled title={T.STORES.EDIT_UNAVAILABLE}>Chỉnh sửa</ButtonBar>
  </AdminActionBar>}
  </>;
}

export default function AdminStoresPage() { return <AdminShell><StoresContent /></AdminShell>; }
