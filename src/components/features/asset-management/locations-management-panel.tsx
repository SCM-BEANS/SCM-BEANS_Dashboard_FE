import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ZodError } from "zod";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import { locationsApi, LocationOwnerMismatchError } from "@/apis/locations.api";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { getApiErrorMessage, isUncertainApiMutation } from "@/lib/api-errors";
import { LocationCreateSchema, type LocationCreate } from "@/schema/locations.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import { loadProfilePage, nextProfilePage } from "./asset-management-data";
import styles from "./asset-management.module.css";

type Mode = "owner" | "moderator";
type TableVariant = "operations" | "moderator" | "customer";

const emptyForm: LocationCreate = { name: "", address: "", city: "", contactPerson: "", phoneNumber: "" };

export function LocationsManagementPanel({
  mode,
  ownerId,
  tableVariant = mode === "moderator" ? "moderator" : "customer",
}: {
  mode: Mode;
  ownerId: string | null;
  tableVariant?: TableVariant;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [form, setForm] = useState<LocationCreate>(emptyForm);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [blockResubmit, setBlockResubmit] = useState(false);
  const operatorOwners = useInfiniteQuery({
    queryKey: ["dolores", "profiles", "managed-owners"],
    queryFn: ({ pageParam, signal }) => loadProfilePage("OWNER", pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: nextProfilePage,
    enabled: mode === "moderator",
  });
  const owners = operatorOwners.data?.pages.flatMap((page) => page.items) ?? [];
  const activeOwnerId = mode === "owner" ? ownerId : selectedOwnerId;
  const validActiveOwner = ProfileIdSchema.safeParse(activeOwnerId).success;
  const locations = useInfiniteQuery({
    queryKey: ["dolores", "locations", "owner", activeOwnerId],
    queryFn: ({ pageParam, signal }) => locationsApi.listPage({
      ownerId: activeOwnerId!, page: pageParam, size: 50,
    }, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.hasNext ? lastPage.page + 1 : undefined,
    enabled: validActiveOwner,
  });
  const locationRows = locations.data?.pages.flatMap((page) => page.items) ?? [];
  const selectedOwner = owners.find((profile) => profile.idaasUserId === activeOwnerId);

  const create = useMutation({
    mutationFn: () => locationsApi.create(activeOwnerId!, LocationCreateSchema.parse({
      name: form.name,
      address: form.address || undefined,
      city: form.city || undefined,
      contactPerson: form.contactPerson || undefined,
      phoneNumber: form.phoneNumber || undefined,
    })),
    onSuccess: async (location) => {
      setConfirmOpen(false);
      setCreateFormOpen(false);
      setForm(emptyForm);
      setRequestError("");
      setBlockResubmit(false);
      setSuccessMessage(`Đã tạo địa điểm “${location.name}”.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "locations", "owner", activeOwnerId] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "admin-stores"] }),
      ]);
    },
    onError: (error: unknown) => {
      setConfirmOpen(false);
      setRequestError(getApiErrorMessage(error, "mutation"));
      if (error instanceof LocationOwnerMismatchError || error instanceof ZodError || isUncertainApiMutation(error)) {
        setBlockResubmit(true);
        void queryClient.invalidateQueries({ queryKey: ["dolores", "locations", "owner", activeOwnerId] });
      }
    },
  });

  const changeOwner = (nextOwnerId: string) => {
    setSelectedOwnerId(nextOwnerId);
    setCreateFormOpen(false);
    setRequestError("");
    setSuccessMessage("");
    setBlockResubmit(false);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRequestError("");
    if (!validActiveOwner || blockResubmit || create.isPending) return;
    if (!LocationCreateSchema.safeParse({
      name: form.name,
      address: form.address || undefined,
      city: form.city || undefined,
      contactPerson: form.contactPerson || undefined,
      phoneNumber: form.phoneNumber || undefined,
    }).success) {
      setRequestError("Nhập tên địa điểm hợp lệ rồi thử lại.");
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <section className={styles.panel} aria-labelledby="locations-management-title">
      <h2 id="locations-management-title">Địa điểm</h2>
      <p className={styles.description}>
        {mode === "owner"
          ? "Danh sách địa điểm và thao tác tạo mới được giới hạn theo Owner trong phiên đăng nhập."
          : "Chỉ các Owner được API cho phép xem mới có thể chọn để quản lý địa điểm."}
      </p>
      {mode === "owner" && !validActiveOwner && <p className={styles.notice} role="alert">Không xác định được Owner từ phiên đăng nhập.</p>}
      {mode === "moderator" && <div className={styles.formGrid}>
        <label className={styles.field} htmlFor="managed-owner-select">Owner
          <select id="managed-owner-select" value={selectedOwnerId} onChange={(event) => changeOwner(event.target.value)} disabled={operatorOwners.isPending || operatorOwners.isError}>
            <option value="">{operatorOwners.isPending ? "Đang tải Owner…" : "Chọn Owner"}</option>
            {owners.map((profile) => <option key={profile.idaasUserId} value={profile.idaasUserId}>{profile.fullName} · {profile.email}</option>)}
          </select>
        </label>
        {operatorOwners.hasNextPage && <div className={styles.actions}>
          <ButtonBar type="button" disabled={operatorOwners.isFetchingNextPage} onClick={() => void operatorOwners.fetchNextPage()}>
            {operatorOwners.isFetchingNextPage ? "Đang tải…" : "Tải thêm Owner"}
          </ButtonBar>
        </div>}
      </div>}
      {mode === "moderator" && operatorOwners.isPending && <p className={styles.notice} role="status">Đang tải danh sách Owner…</p>}
      {mode === "moderator" && operatorOwners.isError && <div className={styles.notice} role="alert">
        <p>{getApiErrorMessage(operatorOwners.error)}</p>
        <ButtonBar type="button" disabled={operatorOwners.isFetching} onClick={() => void operatorOwners.refetch()}>Thử tải lại</ButtonBar>
      </div>}
      {mode === "moderator" && operatorOwners.data && owners.length === 0 && <p className={styles.notice} role="status">API không trả về Owner trong phạm vi của Moderator này.</p>}
      {validActiveOwner && <>
        {selectedOwner && <p className={styles.hint}>Đang xem địa điểm của {selectedOwner.fullName}.</p>}
        <div className={styles.tableHeader}>
          <h3>Danh sách địa điểm</h3>
          <ButtonBar type="button" onClick={() => { setCreateFormOpen((open) => !open); setRequestError(""); setSuccessMessage(""); }}>
            {createFormOpen ? "Đóng biểu mẫu" : "Tạo địa điểm"}
          </ButtonBar>
        </div>
        {createFormOpen && <form className={styles.formGrid} onSubmit={submit}>
          <label className={styles.field}>Tên địa điểm *
            <input required maxLength={160} value={form.name} disabled={create.isPending || blockResubmit} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className={styles.field}>Địa chỉ
            <input maxLength={500} value={form.address ?? ""} disabled={create.isPending || blockResubmit} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
          </label>
          <label className={styles.field}>Thành phố
            <input maxLength={120} value={form.city ?? ""} disabled={create.isPending || blockResubmit} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
          </label>
          <label className={styles.field}>Người liên hệ
            <input maxLength={160} value={form.contactPerson ?? ""} disabled={create.isPending || blockResubmit} onChange={(event) => setForm((current) => ({ ...current, contactPerson: event.target.value }))} />
          </label>
          <label className={styles.field}>Số điện thoại
            <input maxLength={40} value={form.phoneNumber ?? ""} disabled={create.isPending || blockResubmit} onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} />
          </label>
          <div className={styles.actions}>
            <ButtonBar type="submit" disabled={create.isPending || blockResubmit}>{create.isPending ? "Đang tạo…" : "Lưu địa điểm"}</ButtonBar>
            <ButtonBar type="button" disabled={create.isPending} onClick={() => setCreateFormOpen(false)}>Hủy</ButtonBar>
          </div>
        </form>}
        {requestError && <p className={styles.notice} role="alert">{requestError}</p>}
        {blockResubmit && <p className={styles.notice} role="alert">
          Kết quả tạo địa điểm chưa xác định. Tải lại trang để kiểm tra danh sách trước khi tạo lại.
          <ButtonBar type="button" onClick={() => router.reload()}>Tải lại trang</ButtonBar>
        </p>}
        {successMessage && <p className={styles.notice} data-kind="success" role="status">{successMessage}</p>}
        {locations.isPending && <p className={styles.notice} role="status">Đang tải địa điểm…</p>}
        {locations.isError && <div className={styles.notice} role="alert">
          <p>{getApiErrorMessage(locations.error)}</p>
          <ButtonBar type="button" disabled={locations.isFetching} onClick={() => void locations.refetch()}>Thử tải lại</ButtonBar>
        </div>}
        {locations.data && locationRows.length === 0 && <p className={styles.notice} role="status">Owner chưa có địa điểm.</p>}
        {locations.data && locationRows.length > 0 && <DataTable
          variant={tableVariant}
          rows={locationRows}
          rowKey={(location) => location.id}
          columns={[
            { key: "name", header: "Tên địa điểm", render: (location) => <strong>{location.name}</strong> },
            { key: "address", header: "Địa chỉ", render: (location) => [location.address, location.city].filter(Boolean).join(" · ") || "—" },
            { key: "machines", header: "Số máy", render: (location) => location.machineCount ?? "—" },
            { key: "status", header: "Trạng thái", render: (location) => location.active === false ? "Ngừng hoạt động" : "Hoạt động" },
            { key: "id", header: "UUID", render: (location) => <span className={styles.code}><TruncatedId value={location.id} /></span> },
          ]}
        />}
        {locations.hasNextPage && <div className={styles.actions}>
          <ButtonBar type="button" disabled={locations.isFetchingNextPage} onClick={() => void locations.fetchNextPage()}>
            {locations.isFetchingNextPage ? "Đang tải…" : "Tải thêm địa điểm"}
          </ButtonBar>
        </div>}
      </>}
      {confirmOpen && <NotificationDialog
        variant="confirm"
        title="Xác nhận tạo địa điểm"
        description={`${form.name.trim()} · ${selectedOwner?.fullName ?? (mode === "owner" ? "Owner hiện tại" : activeOwnerId)}`}
        primaryAction={{ label: create.isPending ? "Đang tạo…" : "Xác nhận tạo", pending: create.isPending, onClick: () => create.mutate() }}
        secondaryAction={{ label: "Hủy", disabled: create.isPending, onClick: () => setConfirmOpen(false) }}
        onClose={() => { if (!create.isPending) setConfirmOpen(false); }}
        closeOnEscape={!create.isPending}
      />}
    </section>
  );
}
