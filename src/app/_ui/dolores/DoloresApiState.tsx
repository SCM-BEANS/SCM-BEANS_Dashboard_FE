import { DoloresButton, DoloresNotice } from '@/app/_ui/dolores/DoloresUI';
import { describeDoloresError } from '@/hooks/dolores/queryPolicy';

export function DoloresApiErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <DoloresNotice title="Không tải được dữ liệu" tone="warning">
      <p>{describeDoloresError(error)}</p>
      <div className="mt-3"><DoloresButton onClick={onRetry} variant="secondary">Thử lại</DoloresButton></div>
    </DoloresNotice>
  );
}

export function DoloresLoadingState() {
  return <DoloresNotice title="Đang tải dữ liệu">Vui lòng chờ trong giây lát.</DoloresNotice>;
}

export function DoloresEmptyState({ message }: { message: string }) {
  return <DoloresNotice title="Không có dữ liệu">{message}</DoloresNotice>;
}
