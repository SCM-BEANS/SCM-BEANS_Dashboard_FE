import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ZodError } from "zod";
import { technicianAssignmentsApi } from "@/apis/technician-assignments.api";
import { getApiErrorMessage, isUncertainApiMutation } from "@/lib/api-errors";
import { ButtonBar } from "@/components/button/button-bar";
import { MachineIdSchema } from "@/schema/machines.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import { loadProfilePage, nextProfilePage } from "./asset-management-data";
import styles from "./asset-management.module.css";

export function TechnicianMachineAccessPanel({ machineId }: { machineId: string }) {
  const [technicianId, setTechnicianId] = useState("");
  const [confirmAction, setConfirmAction] = useState<"assign" | "revoke" | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [blockResubmit, setBlockResubmit] = useState(false);
  const validMachineId = MachineIdSchema.safeParse(machineId).success;
  const technicians = useInfiniteQuery({
    queryKey: ["dolores", "profiles", "active-technicians"],
    queryFn: ({ pageParam, signal }) => loadProfilePage("TECHNICIAN", pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: nextProfilePage,
    enabled: validMachineId,
  });
  const technicianOptions = technicians.data?.pages.flatMap((page) => page.items)
    .filter((profile) => profile.status === "ACTIVE" && profile.emailVerified && profile.roles.some((role) => role.toUpperCase().replace(/^ROLE_/, "") === "TECHNICIAN")) ?? [];
  const selectedTechnician = technicianOptions.find((profile) => profile.idaasUserId === technicianId);
  const validTechnicianId = ProfileIdSchema.safeParse(technicianId).success;
  const assign = useMutation({
    mutationFn: () => technicianAssignmentsApi.assign(technicianId, machineId),
    onSuccess: (assignment) => {
      setErrorMessage("");
      setMessage(`API đã xác nhận cấp quyền cho ${selectedTechnician?.fullName ?? assignment.idaasUserId} từ ${new Date(assignment.assignedAt).toLocaleString("vi-VN")}.`);
      setConfirmAction(null);
    },
    onError: (error: unknown) => {
      setConfirmAction(null);
      setErrorMessage(getApiErrorMessage(error, "mutation"));
      if (error instanceof ZodError || isUncertainApiMutation(error)) {
        setBlockResubmit(true);
        setErrorMessage("Kết quả cấp quyền chưa xác định hoặc phản hồi không hợp lệ. API hiện chưa có thao tác đọc trạng thái quyền máy; hãy xác minh trước khi gửi thêm yêu cầu.");
      }
    },
  });
  const revoke = useMutation({
    mutationFn: () => technicianAssignmentsApi.revoke(technicianId, machineId),
    onSuccess: () => {
      setErrorMessage("");
      setMessage(`API đã nhận yêu cầu thu hồi quyền của ${selectedTechnician?.fullName ?? technicianId}.`);
      setConfirmAction(null);
    },
    onError: (error: unknown) => {
      setConfirmAction(null);
      setErrorMessage(getApiErrorMessage(error, "mutation"));
      if (error instanceof ZodError || isUncertainApiMutation(error)) {
        setBlockResubmit(true);
        setErrorMessage("Kết quả thu hồi quyền chưa xác định hoặc phản hồi không hợp lệ. API hiện chưa có thao tác đọc trạng thái quyền máy; hãy xác minh trước khi gửi thêm yêu cầu.");
      }
    },
  });
  const pending = assign.isPending || revoke.isPending;

  return (
    <section className={styles.panel} aria-labelledby={`technician-access-title-${machineId}`}>
      <h2 id={`technician-access-title-${machineId}`}>Quyền Technician trên máy</h2>
      <p className={styles.description}>Đây là quyền truy cập máy ở cấp Owner, tách biệt với việc giao ticket bảo trì. Backend hiện chưa cung cấp API đọc danh sách quyền hiện có; trạng thái chỉ được xác nhận sau thao tác.</p>
      {technicians.isPending && <p className={styles.notice} role="status">Đang tải Technician…</p>}
      {technicians.isError && <div className={styles.notice} role="alert">
        <p>{getApiErrorMessage(technicians.error)}</p>
        <ButtonBar type="button" disabled={technicians.isFetching} onClick={() => void technicians.refetch()}>Thử tải lại</ButtonBar>
      </div>}
      {technicians.data && technicianOptions.length === 0 && !technicians.hasNextPage && <p className={styles.notice} role="status">Không tìm thấy Technician đang hoạt động trong phạm vi API.</p>}
      {technicians.data && <div className={styles.formGrid}>
        <label className={styles.field} htmlFor={`technician-select-${machineId}`}>
          Technician
          <select id={`technician-select-${machineId}`} value={technicianId} onChange={(event) => {
            setTechnicianId(event.target.value);
            setMessage("");
          }}>
            <option value="">Chọn Technician</option>
            {technicianOptions.map((profile) => <option key={profile.idaasUserId} value={profile.idaasUserId}>{profile.fullName} · {profile.email}</option>)}
          </select>
        </label>
        <div className={styles.actions}>
          <ButtonBar type="button" disabled={!validTechnicianId || pending || blockResubmit} onClick={() => { setMessage(""); setErrorMessage(""); setConfirmAction("assign"); }}>
            Cấp quyền máy
          </ButtonBar>
          <ButtonBar type="button" disabled={!validTechnicianId || pending || blockResubmit} onClick={() => { setMessage(""); setErrorMessage(""); setConfirmAction("revoke"); }}>
            Thu hồi quyền máy
          </ButtonBar>
          {technicians.hasNextPage && <ButtonBar type="button" disabled={technicians.isFetchingNextPage} onClick={() => void technicians.fetchNextPage()}>
            {technicians.isFetchingNextPage ? "Đang tải…" : "Tải thêm Technician"}
          </ButtonBar>}
        </div>
      </div>}
      {errorMessage && <p className={styles.notice} role="alert">{errorMessage}</p>}
      {message && <p className={styles.notice} data-kind="success" role="status">{message}</p>}
      {confirmAction && selectedTechnician && <div className={styles.notice} role="group" aria-label="Xác nhận quyền Technician">
        <p>{confirmAction === "assign" ? "Cấp quyền truy cập máy" : "Thu hồi quyền truy cập máy"} cho {selectedTechnician.fullName}?</p>
        <div className={styles.actions}>
          <ButtonBar type="button" disabled={pending} onClick={() => confirmAction === "assign" ? assign.mutate() : revoke.mutate()}>
            {pending ? "Đang xử lý…" : "Xác nhận"}
          </ButtonBar>
          <ButtonBar type="button" disabled={pending} onClick={() => setConfirmAction(null)}>Hủy</ButtonBar>
        </div>
      </div>}
    </section>
  );
}
