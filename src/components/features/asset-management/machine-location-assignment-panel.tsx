import Link from "next/link";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ZodError } from "zod";
import { locationsApi, LocationMachineAssignmentMismatchError } from "@/apis/locations.api";
import { getApiErrorMessage, isUncertainApiMutation } from "@/lib/api-errors";
import { ButtonBar } from "@/components/button/button-bar";
import { LocationIdSchema } from "@/schema/locations.schema";
import { MachineIdSchema } from "@/schema/machines.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import styles from "./asset-management.module.css";

type TableVariant = "operations" | "moderator" | "customer";

export function MachineLocationAssignmentPanel({
  machineId,
  ownerId,
  currentLocationId,
  variant = "operations",
  createLocationHref,
}: {
  machineId: string;
  ownerId: string | null | undefined;
  currentLocationId: string | null | undefined;
  variant?: TableVariant;
  createLocationHref?: string;
}) {
  const queryClient = useQueryClient();
  const [targetLocationId, setTargetLocationId] = useState(currentLocationId ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [blockResubmit, setBlockResubmit] = useState(false);
  const validOwnerId = ProfileIdSchema.safeParse(ownerId).success;
  const validMachineId = MachineIdSchema.safeParse(machineId).success;

  const locations = useInfiniteQuery({
    queryKey: ["dolores", "locations", "owner", ownerId, "machine-assignment"],
    queryFn: ({ pageParam, signal }) => locationsApi.listPage({
      ownerId: ownerId!, activeOnly: true, page: pageParam, size: 100,
    }, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.hasNext ? lastPage.page + 1 : undefined,
    enabled: validOwnerId && validMachineId,
  });
  const availableLocations = locations.data?.pages.flatMap((page) => page.items) ?? [];
  const selectedLocation = availableLocations.find((location) => location.id === targetLocationId);
  const currentLocation = availableLocations.find((location) => location.id === currentLocationId);

  const assign = useMutation({
    mutationFn: () => locationsApi.assignMachine(targetLocationId, machineId),
    onSuccess: async () => {
      setRequestError("");
      setSuccessMessage(`Đã gán máy vào địa điểm ${selectedLocation?.name ?? targetLocationId}.`);
      setConfirmOpen(false);
      setBlockResubmit(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "machines"] }),
        queryClient.invalidateQueries({ queryKey: ["owner-machines"] }),
        queryClient.invalidateQueries({ queryKey: ["owner-machine", machineId] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "locations"] }),
      ]);
    },
    onError: (error: unknown) => {
      setConfirmOpen(false);
      setRequestError(getApiErrorMessage(error, "mutation"));
      if (error instanceof LocationMachineAssignmentMismatchError || error instanceof ZodError || isUncertainApiMutation(error)) setBlockResubmit(true);
    },
  });

  const requestAssignment = () => {
    setRequestError("");
    setSuccessMessage("");
    if (!LocationIdSchema.safeParse(targetLocationId).success || targetLocationId === currentLocationId) return;
    setConfirmOpen(true);
  };

  return (
    <section className={styles.panel} data-variant={variant} aria-labelledby={`machine-location-title-${machineId}`}>
      <h2 id={`machine-location-title-${machineId}`}>Địa điểm của máy</h2>
      <p className={styles.description}>Địa điểm phải thuộc cùng Owner với máy. Quyền truy cập được kiểm tra lại bởi Dolores khi lưu.</p>
      {!validOwnerId && <p className={styles.notice} role="alert">Không xác định được Owner của máy; chưa thể tải địa điểm.</p>}
      {locations.isPending && <p className={styles.notice} role="status">Đang tải địa điểm…</p>}
      {locations.isError && <div className={styles.notice} role="alert">
        <p>{getApiErrorMessage(locations.error)}</p>
        <ButtonBar type="button" disabled={locations.isFetching} onClick={() => void locations.refetch()}>Thử tải lại</ButtonBar>
      </div>}
      {locations.data && <>
        <p className={styles.notice} role="status">
          Địa điểm hiện tại: {currentLocation?.name ?? (currentLocationId || "Chưa gán địa điểm")}
        </p>
        {availableLocations.length === 0 ? (
          <p className={styles.notice} role="status">
            Owner chưa có địa điểm đang hoạt động. {createLocationHref ? <Link href={createLocationHref}>Tạo địa điểm</Link> : null}
          </p>
        ) : (
          <div className={styles.formGrid}>
            <label className={styles.field} htmlFor={`location-select-${machineId}`}>
              Chọn địa điểm
              <select id={`location-select-${machineId}`} value={targetLocationId} onChange={(event) => {
                setTargetLocationId(event.target.value);
                setRequestError("");
                setSuccessMessage("");
                setBlockResubmit(false);
              }}>
                <option value="">Chọn địa điểm</option>
                {availableLocations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}{location.city ? ` · ${location.city}` : ""}</option>
                ))}
              </select>
            </label>
            <div className={styles.actions}>
              <ButtonBar
                type="button"
                disabled={!selectedLocation || targetLocationId === currentLocationId || assign.isPending || blockResubmit}
                onClick={requestAssignment}
              >
                {assign.isPending ? "Đang gán…" : "Gán vào địa điểm"}
              </ButtonBar>
              {locations.hasNextPage && <ButtonBar type="button" disabled={locations.isFetchingNextPage} onClick={() => void locations.fetchNextPage()}>
                {locations.isFetchingNextPage ? "Đang tải…" : "Tải thêm địa điểm"}
              </ButtonBar>}
            </div>
          </div>
        )}
      </>}
      {requestError && <p className={styles.notice} role="alert">{requestError}</p>}
      {blockResubmit && <p className={styles.notice} role="alert">Kết quả yêu cầu chưa xác định. Hãy tải lại hồ sơ máy để kiểm tra vị trí hiện tại trước khi thao tác tiếp.</p>}
      {successMessage && <p className={styles.notice} data-kind="success" role="status">{successMessage}</p>}
      {confirmOpen && selectedLocation ? (
        <div className={styles.notice} role="group" aria-label="Xác nhận gán máy">
          <p>Gán máy vào địa điểm “{selectedLocation.name}”?</p>
          <div className={styles.actions}>
            <ButtonBar type="button" disabled={assign.isPending} onClick={() => assign.mutate()}>
              {assign.isPending ? "Đang gán…" : "Xác nhận gán"}
            </ButtonBar>
            <ButtonBar type="button" disabled={assign.isPending} onClick={() => setConfirmOpen(false)}>Hủy</ButtonBar>
          </div>
        </div>
      ) : null}
    </section>
  );
}
