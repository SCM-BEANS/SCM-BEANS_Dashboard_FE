import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { locationsApi } from "@/apis/locations.api";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { getApiErrorMessage } from "@/lib/api-errors";
import { LocationIdSchema } from "@/schema/locations.schema";
import type { Machine } from "@/schema/machines.schema";
import styles from "./location-detail.module.css";

type TransferableMachine = Pick<Machine, "id" | "ownerId" | "locationId" | "serialNumber">;

function transferErrorMessage(error: unknown): string {
  const response = typeof error === "object" && error !== null && "response" in error
    ? (error as { response?: { status?: unknown } }).response
    : undefined;
  switch (response?.status) {
    case 400:
      return "Địa điểm đích phải đang hoạt động và thuộc cùng Owner với máy.";
    case 403:
      return "Bạn không có quyền chuyển máy tới địa điểm này.";
    case 404:
      return "Không tìm thấy máy hoặc địa điểm đích. Hãy tải lại dữ liệu rồi thử lại.";
    case 409:
      return "Máy đã được cập nhật ở nơi khác. Hãy tải lại dữ liệu rồi thử lại.";
    default:
      return getApiErrorMessage(error, "mutation");
  }
}

export function TransferMachineDialog({
  machine,
  currentLocationName,
  onClose,
  onSuccess,
}: {
  machine: TransferableMachine;
  currentLocationName?: string | null;
  onClose: () => void;
  onSuccess: (targetLocationName: string) => void;
}) {
  const queryClient = useQueryClient();
  const ownerId = machine.ownerId ?? "";
  const validOwnerId = LocationIdSchema.safeParse(ownerId).success;
  const currentLocationId = LocationIdSchema.safeParse(machine.locationId).success ? machine.locationId : null;
  const [targetLocationId, setTargetLocationId] = useState("");
  const [reason, setReason] = useState("");
  const [requestError, setRequestError] = useState("");
  const activeLocations = useInfiniteQuery({
    queryKey: ["dolores", "locations", "transfer-targets", ownerId],
    queryFn: ({ pageParam, signal }) => locationsApi.listPage({
      ownerId,
      activeOnly: true,
      page: pageParam,
      size: 50,
    }, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.hasNext ? lastPage.page + 1 : undefined,
    enabled: validOwnerId,
    retry: false,
  });
  const targets = activeLocations.data?.pages.flatMap((page) => page.items)
    .filter((location) => location.ownerId === ownerId && location.active === true && location.id !== currentLocationId) ?? [];
  const selectedTarget = targets.find((location) => location.id === targetLocationId);

  const transfer = useMutation({
    mutationFn: () => locationsApi.transferMachine(machine.id, {
      targetLocationId,
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    }),
    onSuccess: async (updatedMachine) => {
      const affectedLocationIds = new Set([currentLocationId, updatedMachine.locationId].filter((id): id is string => Boolean(id)));
      await Promise.all([
        ...Array.from(affectedLocationIds).flatMap((locationId) => [
          queryClient.invalidateQueries({ queryKey: ["dolores", "locations", "stats", locationId] }),
          queryClient.invalidateQueries({ queryKey: ["dolores", "locations", "machines", locationId] }),
        ]),
        queryClient.invalidateQueries({ queryKey: ["dolores", "machines"] }),
        queryClient.invalidateQueries({ queryKey: ["owner-machine", machine.id] }),
        queryClient.invalidateQueries({ queryKey: ["owner-machines"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "locations", "owner"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "admin-stores"] }),
      ]);
      onSuccess(selectedTarget?.name ?? "địa điểm đích");
    },
    onError: (error: unknown) => setRequestError(transferErrorMessage(error)),
  });

  return (
    <NotificationDialog
      variant="confirm"
      title="Chuyển máy sang điểm bán khác"
      description={`Máy ${machine.serialNumber?.trim() || machine.id} · Vị trí hiện tại: ${currentLocationName?.trim() || (currentLocationId ? "Địa điểm hiện tại" : "Kho")}.`}
      primaryAction={{
        label: "Xác nhận chuyển máy",
        pending: transfer.isPending,
        pendingLabel: "Đang chuyển…",
        disabled: transfer.isPending || !selectedTarget,
        onClick: () => { setRequestError(""); transfer.mutate(); },
      }}
      secondaryAction={{ label: "Hủy", disabled: transfer.isPending, onClick: onClose }}
      onClose={() => { if (!transfer.isPending) onClose(); }}
      closeOnEscape={!transfer.isPending}
    >
      <div className={styles.dialogField}>
        <label htmlFor="transfer-machine-target">Địa điểm đích *</label>
        <select
          id="transfer-machine-target"
          value={targetLocationId}
          disabled={transfer.isPending || activeLocations.isPending || activeLocations.isError}
          onChange={(event) => { setTargetLocationId(event.target.value); setRequestError(""); }}
        >
          <option value="">{activeLocations.isPending ? "Đang tải địa điểm…" : "Chọn địa điểm đang hoạt động"}</option>
          {targets.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select>
        {activeLocations.isError && <p className={styles.dialogError} role="alert">{getApiErrorMessage(activeLocations.error)}</p>}
        {activeLocations.isSuccess && targets.length === 0 && <p className={styles.notice} role="status">Owner chưa có địa điểm đang hoạt động khác để chuyển máy tới.</p>}
        {activeLocations.hasNextPage && <button
          type="button"
          disabled={activeLocations.isFetchingNextPage}
          onClick={() => void activeLocations.fetchNextPage()}
        >{activeLocations.isFetchingNextPage ? "Đang tải…" : "Tải thêm địa điểm"}</button>}
      </div>
      <div className={styles.dialogField}>
        <label htmlFor="transfer-machine-reason">Lý do (không bắt buộc)</label>
        <textarea
          id="transfer-machine-reason"
          rows={3}
          maxLength={500}
          value={reason}
          disabled={transfer.isPending}
          onChange={(event) => setReason(event.target.value)}
        />
        <span className={styles.counter}>{reason.length}/500</span>
      </div>
      {requestError && <p className={styles.dialogError} role="alert">{requestError}</p>}
    </NotificationDialog>
  );
}
