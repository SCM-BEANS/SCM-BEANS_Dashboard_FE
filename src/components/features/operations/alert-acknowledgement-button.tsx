import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import { notificationsApi } from "@/apis/notifications.api";

export function AlertAcknowledgementButton({ id, level }: { id: string; level: string }) {
  const queryClient = useQueryClient();
  const acknowledge = useMutation({
    mutationFn: () => notificationsApi.acknowledgeAlert(id),
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dolores", "alerts"] }),
  });
  const eligible = ["CRITICAL", "HIGH"].includes(level.toUpperCase());
  if (!eligible) return null;

  return (
    <div>
      <ButtonBar disabled={acknowledge.isPending} onClick={() => acknowledge.mutate()}>
        {acknowledge.isPending ? "Đang xác nhận…" : "Xác nhận cảnh báo"}
      </ButtonBar>
      {acknowledge.isError && <p role="alert">{getApiErrorMessage(acknowledge.error)}</p>}
      {acknowledge.isSuccess && <p role="status">Đã gửi xác nhận. Danh sách sẽ được tải lại.</p>}
    </div>
  );
}
