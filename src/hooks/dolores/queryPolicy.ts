import { DoloresApiError } from '@/apis/dolores/client';

export function retryDoloresRead(failureCount: number, error: unknown): boolean {
  if (error instanceof DoloresApiError && (error.status === 401 || error.status === 403 || error.kind === 'invalid_response')) {
    return false;
  }
  return failureCount < 1;
}

export function describeDoloresError(error: unknown): string {
  if (error instanceof DoloresApiError) {
    switch (error.kind) {
      case 'unauthenticated': return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.';
      case 'forbidden': return 'Tài khoản không có quyền xem dữ liệu này.';
      case 'invalid_response': return 'Dữ liệu trả về không đúng cấu trúc API đã hỗ trợ.';
      case 'timeout': return 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.';
      case 'network': return 'Không kết nối được tới máy chủ Dolores.';
      default: return 'Không tải được dữ liệu Dolores. Vui lòng thử lại.';
    }
  }
  return 'Không tải được dữ liệu. Vui lòng thử lại.';
}
