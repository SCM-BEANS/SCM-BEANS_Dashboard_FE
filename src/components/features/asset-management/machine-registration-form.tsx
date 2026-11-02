import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ZodError } from "zod";
import { useState, type FormEvent } from "react";
import { machinesApi } from "@/apis/machines.api";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage, isUncertainApiMutation } from "@/lib/api-errors";
import { CreateMachineRequestSchema, MachineTypeSchema } from "@/schema/machines.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import { loadProfilePage, nextProfilePage } from "./asset-management-data";
import styles from "./asset-management.module.css";

type Mode = "owner" | "moderator";

export function MachineRegistrationForm({
  mode,
  ownerId,
  onCancel,
  onCreated,
}: {
  mode: Mode;
  ownerId: string | null;
  onCancel: () => void;
  onCreated: (machineId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [region, setRegion] = useState("");
  const [machineType, setMachineType] = useState<"CONVENTIONAL" | "SMART_IOT">("CONVENTIONAL");
  const [requestError, setRequestError] = useState("");
  const [blockResubmit, setBlockResubmit] = useState(false);
  const ownerProfiles = useInfiniteQuery({
    queryKey: ["dolores", "profiles", "managed-owners"],
    queryFn: ({ pageParam, signal }) => loadProfilePage("OWNER", pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: nextProfilePage,
    enabled: mode === "moderator",
  });
  const owners = ownerProfiles.data?.pages.flatMap((page) => page.items) ?? [];
  const activeOwnerId = mode === "owner" ? ownerId : selectedOwnerId;
  const validOwnerId = mode === "owner" || ProfileIdSchema.safeParse(activeOwnerId).success;

  const create = useMutation({
    mutationFn: () => machinesApi.create(CreateMachineRequestSchema.parse({
      serialNumber,
      region: region.trim() || undefined,
      machineType,
      status: "IN_WAREHOUSE",
      cupsServedSinceLastDescale: 0,
      ...(mode === "moderator" ? { ownerId: activeOwnerId } : {}),
    })),
    onSuccess: async (machine) => {
      setRequestError("");
      setBlockResubmit(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "machines"] }),
        queryClient.invalidateQueries({ queryKey: ["owner-machines"] }),
      ]);
      onCreated(machine.id);
    },
    onError: (error: unknown) => {
      setRequestError(getApiErrorMessage(error, "mutation"));
      if (error instanceof ZodError || isUncertainApiMutation(error)) setBlockResubmit(true);
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (create.isPending || blockResubmit || !validOwnerId) return;
    const parsed = CreateMachineRequestSchema.safeParse({
      serialNumber,
      region: region.trim() || undefined,
      machineType,
      status: "IN_WAREHOUSE",
      cupsServedSinceLastDescale: 0,
      ...(mode === "moderator" ? { ownerId: activeOwnerId } : {}),
    });
    if (!parsed.success) {
      setRequestError("Kiểm tra serial và loại máy rồi thử lại.");
      return;
    }
    setRequestError("");
    create.mutate();
  };

  return (
    <section className={styles.panel} aria-labelledby="machine-registration-title">
      <h2 id="machine-registration-title">Đăng ký máy</h2>
      <p className={styles.description}>
        Máy mới được tạo ở trạng thái Trong kho. {mode === "owner" ? "Owner được xác định từ phiên đăng nhập." : "Chọn một Owner mà hồ sơ Moderator hiện tại được phép xem."}
      </p>
      {mode === "moderator" && <>
        {ownerProfiles.isPending && <p className={styles.notice} role="status">Đang tải Owner…</p>}
        {ownerProfiles.isError && <div className={styles.notice} role="alert">
          <p>{getApiErrorMessage(ownerProfiles.error)}</p>
          <ButtonBar type="button" disabled={ownerProfiles.isFetching} onClick={() => void ownerProfiles.refetch()}>Thử tải lại</ButtonBar>
        </div>}
        {ownerProfiles.data && owners.length === 0 && !ownerProfiles.hasNextPage && <p className={styles.notice} role="status">Không có Owner trong phạm vi tài khoản Moderator này.</p>}
      </>}
      <form className={styles.formGrid} onSubmit={submit}>
        {mode === "moderator" && <label className={styles.field} htmlFor="machine-owner-select">Owner *
          <select id="machine-owner-select" required value={selectedOwnerId} disabled={ownerProfiles.isPending || ownerProfiles.isError || create.isPending || blockResubmit} onChange={(event) => setSelectedOwnerId(event.target.value)}>
            <option value="">Chọn Owner</option>
            {owners.map((profile) => <option key={profile.idaasUserId} value={profile.idaasUserId}>{profile.fullName} · {profile.email}</option>)}
          </select>
        </label>}
        {mode === "moderator" && ownerProfiles.hasNextPage && <div className={styles.actions}>
          <ButtonBar type="button" disabled={ownerProfiles.isFetchingNextPage} onClick={() => void ownerProfiles.fetchNextPage()}>
            {ownerProfiles.isFetchingNextPage ? "Đang tải…" : "Tải thêm Owner"}
          </ButtonBar>
        </div>}
        <label className={styles.field}>Serial máy *
          <input required minLength={1} maxLength={120} autoComplete="off" value={serialNumber} disabled={create.isPending || blockResubmit} onChange={(event) => setSerialNumber(event.target.value)} />
        </label>
        <label className={styles.field}>Loại máy *
          <select required value={machineType} disabled={create.isPending || blockResubmit} onChange={(event) => setMachineType(event.target.value as "CONVENTIONAL" | "SMART_IOT")}>
            {MachineTypeSchema.options.map((type) => <option value={type} key={type}>{type === "SMART_IOT" ? "Smart IoT" : "Máy thường"}</option>)}
          </select>
        </label>
        <label className={styles.field}>Khu vực
          <input maxLength={120} value={region} disabled={create.isPending || blockResubmit} onChange={(event) => setRegion(event.target.value)} />
        </label>
        <div className={styles.notice} role="note">Trạng thái ban đầu: Trong kho (IN_WAREHOUSE). Số ly từ lần xả cặn gần nhất: 0.</div>
        {requestError && <p className={styles.notice} role="alert">{requestError}</p>}
        {blockResubmit && <p className={styles.notice} role="alert">Kết quả tạo máy chưa xác định. Tải lại danh sách máy và kiểm tra trước khi gửi lại.</p>}
        <div className={styles.actions}>
          <ButtonBar type="submit" disabled={create.isPending || blockResubmit || !validOwnerId || (mode === "moderator" && (ownerProfiles.isPending || ownerProfiles.isError || !selectedOwnerId))}>
            {create.isPending ? "Đang đăng ký…" : "Đăng ký máy"}
          </ButtonBar>
          {mode === "moderator" && ownerProfiles.isError && <ButtonBar type="button" disabled={ownerProfiles.isFetching} onClick={() => void ownerProfiles.refetch()}>Thử tải lại Owner</ButtonBar>}
          <ButtonBar type="button" disabled={create.isPending} onClick={onCancel}>Hủy</ButtonBar>
        </div>
      </form>
    </section>
  );
}
