export const APP_MESSAGES = {
  API_ERROR: {
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
    ACCOUNT_CREATED_RESPONSE_INVALID: "Tài khoản đã được tạo thành công, nhưng phản hồi không đúng định dạng nên chưa hiển thị được mật khẩu tạm. Vui lòng kiểm tra danh sách; không tạo lại tài khoản.",
    GENERIC: "Không thể hoàn tất yêu cầu. Vui lòng thử lại.",
    INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
    INVALID_MFA_CODE: "Mã xác thực không đúng hoặc đã hết hạn.",
    LOGIN_UNAVAILABLE: "Không thể kết nối máy chủ. Vui lòng thử lại sau.",
    LOGIN_GENERIC: "Không thể đăng nhập. Vui lòng thử lại.",
  },
  CONTRACT: {
    MACHINE_ALREADY_IN_USE: "Máy này đang được sử dụng.",
  },
} as const;
