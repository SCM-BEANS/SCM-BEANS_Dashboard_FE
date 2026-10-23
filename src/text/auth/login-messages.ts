export const LOGIN_MESSAGES = {
  PAGE: {
    TITLE: "Đăng nhập | DOLORES COFFEE",
    DESCRIPTION: "Đăng nhập vào hệ thống quản lý DOLORES COFFEE.",
  },
  BRAND: {
    NAME: "DOLORES",
    TAGLINE: "COFFEE",
    HOME_LABEL: "Về trang chủ DOLORES COFFEE",
  },
  INTRO: {
    EYEBROW: "DOLORES COFFEE",
    TITLE: "Kết nối mọi trải nghiệm cà phê.",
    DESCRIPTION:
      "Quản lý thiết bị và vận hành trên một nền tảng thống nhất.",
  },
  FORM: {
    EYEBROW: "Chào mừng trở lại",
    TITLE: "Đăng nhập",
    DESCRIPTION: "Nhập thông tin tài khoản để tiếp tục.",
    EMAIL_LABEL: "Email",
    EMAIL_PLACEHOLDER: "name@example.com",
    PASSWORD_LABEL: "Mật khẩu",
    PASSWORD_PLACEHOLDER: "Nhập mật khẩu",
    SUBMIT: "Đăng nhập",
    SUBMITTING: "Đang đăng nhập...",
    BACK_HOME: "Về trang chủ",
  },
  MFA: {
    EYEBROW: "Xác thực hai bước",
    TITLE: "Nhập mã xác thực",
    DESCRIPTION: "Nhập mã từ ứng dụng xác thực để hoàn tất đăng nhập.",
    CODE_LABEL: "Mã xác thực",
    CODE_PLACEHOLDER: "Nhập mã",
    SUBMIT: "Xác nhận",
    SUBMITTING: "Đang xác nhận...",
    BACK: "Quay lại đăng nhập",
  },
  ERRORS: {
    INVALID_EMAIL: "Vui lòng nhập email hợp lệ.",
    MISSING_PASSWORD: "Vui lòng nhập mật khẩu.",
    MISSING_CODE: "Vui lòng nhập mã xác thực.",
    INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
    INVALID_CODE: "Mã xác thực không đúng hoặc đã hết hạn.",
    UNAVAILABLE: "Không thể kết nối máy chủ. Vui lòng thử lại sau.",
    GENERIC: "Không thể đăng nhập. Vui lòng thử lại.",
  },
} as const;
