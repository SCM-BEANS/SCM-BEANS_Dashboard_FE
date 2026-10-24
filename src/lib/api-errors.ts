import axios from "axios";
import { ZodError } from "zod";

export const API_ERROR_MESSAGES = {
  INVALID_RESPONSE: "Dữ liệu API trả về không đúng cấu trúc đang hỗ trợ.",
  UNAUTHENTICATED: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
  FORBIDDEN: "Tài khoản hiện tại không có quyền thực hiện thao tác này.",
  NOT_FOUND: "Không tìm thấy dữ liệu được yêu cầu.",
  CONFLICT: "Yêu cầu đang xung đột với dữ liệu hiện tại. Hãy tải lại rồi thử lại.",
  LOCATION_OWNER_MISMATCH: "Dolores đã nhận yêu cầu nhưng phản hồi trả về Owner khác. Cửa hàng có thể đã được tạo; không gửi lại. Hãy kiểm tra danh sách trước.",
  INVALID_REQUEST: "Thông tin gửi đi chưa hợp lệ. Vui lòng kiểm tra rồi thử lại.",
  RATE_LIMITED: "Dịch vụ đang giới hạn yêu cầu. Vui lòng thử lại sau.",
  UNAVAILABLE: "Không kết nối được tới dịch vụ. Vui lòng thử lại sau.",
  UNCERTAIN_MUTATION: "Chưa xác nhận được kết quả từ dịch vụ. Hãy kiểm tra dữ liệu trước khi gửi lại để tránh tạo trùng.",
  GENERIC: "Không thể hoàn tất yêu cầu. Vui lòng thử lại.",
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  INVALID_MFA_CODE: "Mã xác thực không đúng hoặc đã hết hạn.",
  LOGIN_UNAVAILABLE: "Không thể kết nối máy chủ. Vui lòng thử lại sau.",
  LOGIN_GENERIC: "Không thể đăng nhập. Vui lòng thử lại.",
} as const;

export type ApiErrorIntent = "read" | "mutation" | "login" | "mfa";

export function isUncertainApiMutation(error: unknown): boolean {
  if (error instanceof ZodError) return true;
  if (!axios.isAxiosError(error)) return false;

  const response = error.response;
  return !response || response.status >= 500;
}

export function getApiErrorMessage(error: unknown, intent: ApiErrorIntent = "read"): string {
  if (intent === "login" || intent === "mfa") {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return intent === "mfa"
          ? API_ERROR_MESSAGES.INVALID_MFA_CODE
          : API_ERROR_MESSAGES.INVALID_CREDENTIALS;
      }
      if (!error.response || error.response.status >= 500) return API_ERROR_MESSAGES.LOGIN_UNAVAILABLE;
    }
    return API_ERROR_MESSAGES.LOGIN_GENERIC;
  }

  if (error instanceof ZodError) {
    return intent === "mutation"
      ? API_ERROR_MESSAGES.UNCERTAIN_MUTATION
      : API_ERROR_MESSAGES.INVALID_RESPONSE;
  }
  if (!axios.isAxiosError(error)) return API_ERROR_MESSAGES.GENERIC;

  const response = error.response;
  if (!response || response.status >= 500) {
    return intent === "mutation"
      ? API_ERROR_MESSAGES.UNCERTAIN_MUTATION
      : API_ERROR_MESSAGES.UNAVAILABLE;
  }

  const status = response.status;
  if (status === 400 || status === 422) return API_ERROR_MESSAGES.INVALID_REQUEST;
  if (status === 401) return API_ERROR_MESSAGES.UNAUTHENTICATED;
  if (status === 403) return API_ERROR_MESSAGES.FORBIDDEN;
  if (status === 404) return API_ERROR_MESSAGES.NOT_FOUND;
  if (status === 409) return API_ERROR_MESSAGES.CONFLICT;
  if (status === 429) return API_ERROR_MESSAGES.RATE_LIMITED;
  return API_ERROR_MESSAGES.GENERIC;
}
