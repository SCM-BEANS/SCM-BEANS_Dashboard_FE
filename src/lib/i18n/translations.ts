export type Language = "en" | "vi";

export const translations = {
  en: {
    // Sidebar
    nav_overview: "Overview",
    nav_inventory: "Inventory",
    nav_thermodynamics: "Thermodynamics",
    nav_diagnostic: "Diagnostic",
    nav_calibration: "Calibration",
    nav_logs: "Logs",
    nav_model: "3D Model",
    model_preview: "Model Preview",
    machine_info: "Machine Info",
    system_status: "System",
    brewing: "Brewing",
    ready: "Ready",
    offline: "Offline",
    online: "Online",
    maintenance: "Maintenance",
    emergency_stop: "Emergency Stop",
    help: "Help",

    // Config Widget
    system_configuration: "System Configuration",
    coming_soon: "Coming Soon",
    digital_menu_sync: "Digital Menu Sync",
    recipe_dosage_editor: "Recipe & Dosage Editor",

    // Header
    start_cycle: "Start Cycle",

    // Dashboard Overview
    quick_actions: "Quick Actions",
    system_health: "System Health",
    all_systems_nominal: "All systems nominal",
    
    // Status Widget
    status_overview: "Status Overview",
    current_state: "Current State",
    uptime: "Uptime",
    last_sync: "Last Sync",
    firmware_version: "Firmware Version",

    // Production Widget
    production: "Production",
    production_metrics: "Production Metrics",
    cups_today: "Cups Today",
    cups_brewed_today: "Cups Brewed (Today)",
    target: "Target",
    lifetime_cups: "Lifetime Cups",
    efficiency_rating: "Efficiency Rating",
    view_detailed_logs: "View Detailed Logs",

    // Thermodynamics Widget
    thermodynamics: "Thermodynamics",
    thermal_dynamics: "Thermal Dynamics",
    boiler_1_temp: "Boiler 1 Temp",
    boiler_2_temp: "Boiler 2 Temp",
    output_temp: "Output Temp",
    boiler_1: "Boiler 1",
    boiler_2: "Boiler 2",
    output: "Output",
    milk_ch_1: "Milk Ch.1",
    milk_ch_2: "Milk Ch.2",
    brew_pressure: "Brew Pressure",
    target_temp: "Target",

    // Inventory Widget
    inventory_levels: "Inventory Levels",
    inventory_status: "Inventory Status",
    coffee_beans: "Coffee Beans",
    water_volume: "Water Volume",
    water_supply: "Water Supply",
    milk_inventory: "Milk Inventory",
    milk_supply: "Milk Supply",
    capacity: "Capacity",
    mains_connected: "Mains Connected",
    tank_mode: "Tank Mode",
    optimal: "Optimal",
    chamber: "Chamber",

    // Analytics Widget
    analytics: "Analytics & Trends",
    time_range: "Time Range",
    day: "Day",
    week: "Week",
    month: "Month",
    year: "Year",
    peak_brewing_time: "Peak Brewing Time",
    total_cups: "Total Cups",

    // Pages
    dashboard: "Dashboard",
    inventory_management: "Inventory Management",
    thermodynamics_control: "Thermodynamics Control",
    system_inventory: "System Inventory",
    real_time_resource_tracking: "Real-time resource tracking",
    live_temp_pressure_readings: "Live temperature and pressure readings",
  },
  vi: {
    // Sidebar
    nav_overview: "Tổng quan",
    nav_inventory: "Kho nguyên liệu",
    nav_thermodynamics: "Nhiệt động học",
    nav_diagnostic: "Chẩn đoán",
    nav_calibration: "Hiệu chuẩn",
    nav_logs: "Nhật ký",
    nav_model: "Mô hình 3D",
    model_preview: "Xem trước mô hình",
    machine_info: "Thông tin máy",
    system_status: "Hệ thống",
    brewing: "Đang pha",
    ready: "Sẵn sàng",
    offline: "Ngoại tuyến",
    online: "Trực tuyến",
    maintenance: "Bảo trì",
    emergency_stop: "Dừng khẩn cấp",
    help: "Trợ giúp",

    // Config Widget
    system_configuration: "Cấu hình hệ thống",
    coming_soon: "Sắp ra mắt",
    digital_menu_sync: "Đồng bộ menu điện tử",
    recipe_dosage_editor: "Chỉnh sửa công thức & định lượng",

    // Header
    start_cycle: "Bắt đầu pha",

    // Dashboard Overview
    quick_actions: "Hành động nhanh",
    system_health: "Tình trạng hệ thống",
    all_systems_nominal: "Tất cả hệ thống bình thường",

    // Status Widget
    status_overview: "Tổng quan trạng thái",
    current_state: "Trạng thái hiện tại",
    uptime: "Thời gian hoạt động",
    last_sync: "Đồng bộ lần cuối",
    firmware_version: "Phiên bản Firmware",

    // Production Widget
    production: "Sản xuất",
    production_metrics: "Chỉ số sản xuất",
    cups_today: "Số cốc hôm nay",
    cups_brewed_today: "Số cốc đã pha (Hôm nay)",
    target: "Mục tiêu",
    lifetime_cups: "Tổng số cốc",
    efficiency_rating: "Đánh giá hiệu suất",
    view_detailed_logs: "Xem nhật ký chi tiết",

    // Thermodynamics Widget
    thermodynamics: "Nhiệt động học",
    thermal_dynamics: "Nhiệt động học",
    boiler_1_temp: "Nhiệt độ nồi hơi 1",
    boiler_2_temp: "Nhiệt độ nồi hơi 2",
    output_temp: "Nhiệt độ đầu ra",
    boiler_1: "Nồi hơi 1",
    boiler_2: "Nồi hơi 2",
    output: "Đầu ra",
    milk_ch_1: "Khoang sữa 1",
    milk_ch_2: "Khoang sữa 2",
    brew_pressure: "Áp suất pha",
    target_temp: "Mục tiêu",

    // Inventory Widget
    inventory_levels: "Mức nguyên liệu",
    inventory_status: "Tình trạng kho",
    coffee_beans: "Hạt cà phê",
    water_volume: "Lượng nước",
    water_supply: "Nguồn nước",
    milk_inventory: "Lượng sữa",
    milk_supply: "Nguồn sữa",
    capacity: "Sức chứa",
    mains_connected: "Nối mạng cấp nước",
    tank_mode: "Chế độ bình chứa",
    optimal: "Tối ưu",
    chamber: "Khoang",

    // Analytics Widget
    analytics: "Phân tích & Xu hướng",
    time_range: "Khoảng thời gian",
    day: "Ngày",
    week: "Tuần",
    month: "Tháng",
    year: "Năm",
    peak_brewing_time: "Thời gian cao điểm",
    total_cups: "Tổng số ly",

    // Pages
    dashboard: "Bảng điều khiển",
    inventory_management: "Quản lý kho nguyên liệu",
    thermodynamics_control: "Điều khiển Nhiệt động học",
    system_inventory: "Kho hệ thống",
    real_time_resource_tracking: "Theo dõi tài nguyên theo thời gian thực",
    live_temp_pressure_readings: "Đọc nhiệt độ và áp suất trực tiếp",
  }
};

export type TranslationKey = keyof typeof translations.en;
