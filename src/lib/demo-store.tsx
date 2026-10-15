"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ContractRecord = {
  id: string;
  customerId: string;
  customerName: string;
  storeName: string;
  machineId: string;
  machineType: "Smart IoT" | "Máy thường";
  startDate: string;
  endDate: string;
  location: string;
  monthlyRent: number;
  paygRate: number;
  deposit: number;
  installationFee: number;
  maxOfflineDays?: number;
  status: "Còn hiệu lực" | "Sắp hết hạn" | "Đã kết thúc";
  signedFile?: string;
};

export type InvoiceStatus = "awaiting_payment" | "awaiting_reconciliation" | "partially_paid" | "paid" | "awaiting_overpayment_refund" | "refunded";

export type InvoiceRecord = {
  id: string;
  customerId: string;
  customerName: string;
  contractId: string;
  period: string;
  issueDate: string;
  dueDate: string;
  baseFee: number;
  validCups: number;
  paygRate: number;
  otherCharges: number;
  deposit: number;
  total: number;
  status: InvoiceStatus;
  proofFile?: string;
  companyProofFile?: string;
  receivedAmount?: number;
  outstanding?: number;
  outstandingAsOf?: string;
  excess?: number;
  bankReference?: string;
  refundReference?: string;
  refundProof?: string;
  balanceRequestedAt?: string;
};

export type TechnicalTask = {
  id: string;
  kind: string;
  machineId: string;
  contractId: string;
  customerId: string;
  customerName: string;
  technician: string;
  description: string;
  status: string;
  source?: "support" | "buyback";
};

export type SupportRequest = {
  id: string;
  customerId: string;
  customerName: string;
  machineId: string;
  kind: string;
  description: string;
  status: string;
  createdAt: string;
  photoName?: string;
};

export type BuybackCase = {
  id: string;
  customerId: string;
  customerName: string;
  storeName: string;
  contractId: string;
  machineId: string;
  machineType: "Smart IoT" | "Máy thường";
  status: "Chờ Technician đánh giá" | "Chờ Moderator thỏa thuận" | "Chờ hợp đồng mua" | "Chờ chuyển khoản" | "Chờ thu gom" | "Đã điều phối thu gom" | "Đang tân trang & kiểm thử" | "Sẵn sàng cho thuê";
  technicianAssessed: boolean;
  purchaseContractFile?: string;
  paymentProofFile?: string;
  customerAcknowledgedAt?: string;
};

export type DemoStore = {
  version: 1;
  contracts: ContractRecord[];
  invoices: InvoiceRecord[];
  tasks: TechnicalTask[];
  supportRequests: SupportRequest[];
  buybacks: BuybackCase[];
  accounts: { id: string; name: string; email: string; role: string; store: string; status: string }[];
  depositAssessment: { collected: boolean; damageAmount: number; assessedAt: string } | null;
  depositSettlement: { amountToRefund: number; customerOwes: number; notifiedAt: string; dueAt: string } | null;
  depositRefund: { amount: number; reference: string; proofFile: string; completedAt: string } | null;
  contractEvents: { id: string; contractId: string; type: "contract_violation" | "early_termination"; note: string; recordedAt: string }[];
  expiryResponses: { contractId: string; response: "request_new_contract"; respondedAt: string }[];
  replacementAssignments: { id: string; contractId: string; primaryMachineId: string; replacementMachineId: string; machineType: "Smart IoT" | "Máy thường"; assignedAt: string; returnedAt?: string; validCups?: number }[];
  globalMenu: { version: number; recipes: { name: string; coffeeGrams: number; waterMl?: number; milkMl?: number; requiredIngredients: string[] }[] };
  menu: {
    recipes: { name: string; coffeeGrams: number; waterMl?: number; milkMl?: number; status: string }[];
    proposals: { name: string; ingredients: string; status: string }[];
  };
  machineHistory: { date: string; machineId: string; contractId: string; detail: string; recordedBy: string }[];
};

export const initialDemoStore: DemoStore = {
  version: 1,
  contracts: [
    { id: "DL-IOT-2026-0042", customerId: "C-204", customerName: "Nguyễn Minh An", storeName: "Cà phê Mộc", machineId: "S-018", machineType: "Smart IoT", startDate: "2026-04-01", endDate: "2026-10-31", location: "Cà phê Mộc · Quận 3, TP. Hồ Chí Minh", monthlyRent: 750000, paygRate: 1000, deposit: 10000000, installationFee: 1000000, maxOfflineDays: 5, status: "Sắp hết hạn" },
    { id: "DL-R-2026-0041", customerId: "C-204", customerName: "Nguyễn Minh An", storeName: "Cà phê Mộc", machineId: "C-031", machineType: "Máy thường", startDate: "2026-04-01", endDate: "2026-10-31", location: "Cà phê Mộc · Quận 3, TP. Hồ Chí Minh", monthlyRent: 1500000, paygRate: 0, deposit: 10000000, installationFee: 1000000, maxOfflineDays: 5, status: "Sắp hết hạn" },
    { id: "DL-R-2026-0038", customerId: "C-205", customerName: "Phạm Hoài Nam", storeName: "Góc Phố", machineId: "CF-STD-026", machineType: "Máy thường", startDate: "2026-05-01", endDate: "2026-10-31", location: "Góc Phố · Bình Thạnh, TP. Hồ Chí Minh", monthlyRent: 1500000, paygRate: 0, deposit: 10000000, installationFee: 1000000, maxOfflineDays: 5, status: "Sắp hết hạn" },
  ],
  invoices: [
    { id: "INV-2026-09-IOT42", customerId: "C-204", customerName: "Nguyễn Minh An", contractId: "DL-IOT-2026-0042", period: "09/2026", issueDate: "2026-09-30", dueDate: "2026-10-12", baseFee: 750000, validCups: 2160, paygRate: 1000, otherCharges: 0, deposit: 0, total: 2910000, status: "awaiting_payment", outstanding: 2910000 },
    { id: "INV-2026-08-IOT42", customerId: "C-204", customerName: "Nguyễn Minh An", contractId: "DL-IOT-2026-0042", period: "08/2026", issueDate: "2026-08-31", dueDate: "2026-09-11", baseFee: 750000, validCups: 3140, paygRate: 1000, otherCharges: 0, deposit: 0, total: 3890000, status: "paid", receivedAmount: 3890000 },
    { id: "INV-2026-09-REG41", customerId: "C-204", customerName: "Nguyễn Minh An", contractId: "DL-R-2026-0041", period: "09/2026", issueDate: "2026-09-30", dueDate: "2026-10-12", baseFee: 1500000, validCups: 0, paygRate: 0, otherCharges: 0, deposit: 0, total: 1500000, status: "awaiting_payment", outstanding: 1500000 },
    { id: "INV-2026-09-GP38", customerId: "C-205", customerName: "Phạm Hoài Nam", contractId: "DL-R-2026-0038", period: "09/2026", issueDate: "2026-09-30", dueDate: "2026-10-12", baseFee: 1500000, validCups: 0, paygRate: 0, otherCharges: 0, deposit: 0, total: 1500000, status: "awaiting_payment", outstanding: 1500000 },
  ],
  tasks: [
    { id: "YC-017", kind: "Lắp đặt máy thường", machineId: "C-031", contractId: "DL-R-2026-0041", customerId: "C-204", customerName: "Cà phê Mộc", technician: "Lê Quốc Bảo", description: "Giao máy, lắp đặt và ghi nhận bàn giao.", status: "Đang thực hiện" },
    { id: "YC-021", kind: "Kích hoạt Smart IoT", machineId: "S-018", contractId: "DL-IOT-2026-0042", customerId: "C-204", customerName: "Cà phê Mộc", technician: "Lê Quốc Bảo", description: "Kiểm tra kết nối và xác nhận máy gửi dữ liệu.", status: "Chờ liên kết" },
    { id: "YC-023", kind: "Sửa chữa", machineId: "CF-STD-026", contractId: "DL-R-2026-0038", customerId: "C-205", customerName: "Góc Phố", technician: "Lê Quốc Bảo", description: "Kiểm tra máy theo yêu cầu đã ghi nhận.", status: "Đã điều phối" },
    { id: "YC-026", kind: "Thu hồi & đánh giá", machineId: "S-018", contractId: "DL-IOT-2026-0042", customerId: "C-204", customerName: "Cà phê Mộc", technician: "Lê Quốc Bảo", description: "Thu hồi máy và ghi nhận có hư hỏng hay không.", status: "Chờ thu hồi" },
    { id: "YC-030", kind: "Tân trang & kiểm thử", machineId: "CF-STD-026", contractId: "MB-014", customerId: "C-205", customerName: "Góc Phố", technician: "Lê Quốc Bảo", description: "Ghi nhận hoàn tất tân trang và kiểm thử máy thu mua.", status: "Chờ kiểm thử", source: "buyback" },
    { id: "YC-032", kind: "Đánh giá máy thu mua", machineId: "S-018", contractId: "MB-017", customerId: "C-204", customerName: "Cà phê Mộc", technician: "Lê Quốc Bảo", description: "Kiểm tra máy trước khi Moderator chốt điều kiện thu mua.", status: "Đã điều phối", source: "buyback" },
  ],
  supportRequests: [],
  buybacks: [
    { id: "MB-017", customerId: "C-204", customerName: "Nguyễn Minh An", storeName: "Cà phê Mộc", contractId: "DL-IOT-2026-0042", machineId: "S-018", machineType: "Smart IoT", status: "Chờ Technician đánh giá", technicianAssessed: false },
    { id: "MB-014", customerId: "C-205", customerName: "Phạm Hoài Nam", storeName: "Góc Phố", contractId: "DL-R-2026-0038", machineId: "CF-STD-026", machineType: "Máy thường", status: "Đang tân trang & kiểm thử", technicianAssessed: true },
  ],
  accounts: [
    { id: "C-204", name: "Nguyễn Minh An", email: "minhan@example.vn", role: "Khách hàng", store: "Cà phê Mộc", status: "Đang hoạt động" },
    { id: "C-205", name: "Phạm Hoài Nam", email: "hoainam@example.vn", role: "Khách hàng", store: "Góc Phố", status: "Đang hoạt động" },
    { id: "ACC-MOD-01", name: "Trần Thu Hà", email: "thuha@example.vn", role: "Moderator", store: "—", status: "Đang hoạt động" },
    { id: "ACC-TECH-01", name: "Lê Quốc Bảo", email: "quocbao@example.vn", role: "Technician", store: "—", status: "Đang hoạt động" },
  ],
  depositAssessment: null,
  depositSettlement: null,
  depositRefund: null,
  contractEvents: [],
  expiryResponses: [],
  replacementAssignments: [
    { id: "REP-018-022", contractId: "DL-IOT-2026-0042", primaryMachineId: "S-018", replacementMachineId: "S-022", machineType: "Smart IoT", assignedAt: "2026-09-10", returnedAt: "2026-09-12", validCups: 160 },
  ],
  globalMenu: {
    version: 14,
    recipes: [
      { name: "Espresso", coffeeGrams: 18, waterMl: 40, requiredIngredients: ["Cà phê", "Nước"] },
      { name: "Cà phê sữa tươi", coffeeGrams: 18, milkMl: 120, requiredIngredients: ["Cà phê", "Sữa tươi"] },
      { name: "Americano", coffeeGrams: 18, waterMl: 120, requiredIngredients: ["Cà phê", "Nước"] },
    ],
  },
  menu: {
    recipes: [
      { name: "Espresso", coffeeGrams: 18, waterMl: 40, status: "Theo Global Menu" },
      { name: "Cà phê sữa tươi", coffeeGrams: 18, milkMl: 120, status: "Theo Global Menu" },
      { name: "Americano", coffeeGrams: 18, waterMl: 120, status: "Theo Global Menu" },
    ],
    proposals: [],
  },
  machineHistory: [
    { date: "12/09/2026", machineId: "S-018", contractId: "DL-IOT-2026-0042", detail: "Thay tạm bằng máy cùng loại S-022", recordedBy: "Moderator · Technician" },
    { date: "08/09/2026", machineId: "S-018", contractId: "DL-IOT-2026-0042", detail: "Kiểm tra kết nối, ghi nhận hoạt động", recordedBy: "Technician" },
    { date: "01/04/2026", machineId: "S-018", contractId: "DL-IOT-2026-0042", detail: "Bàn giao, kích hoạt và gắn Global Menu", recordedBy: "Technician" },
    { date: "01/04/2026", machineId: "C-031", contractId: "DL-R-2026-0041", detail: "Bàn giao máy thường theo hợp đồng", recordedBy: "Technician" },
    { date: "01/05/2026", machineId: "CF-STD-026", contractId: "DL-R-2026-0038", detail: "Bàn giao máy thường theo hợp đồng", recordedBy: "Technician" },
  ],
};

type StoreContextValue = {
  store: DemoStore;
  updateStore: (update: (current: DemoStore) => DemoStore) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);
const STORAGE_KEY = "dolores:demo-store:v4";

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState(initialDemoStore);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoStore;
        if (parsed.version === 1) {
          const migrated = { ...initialDemoStore, ...parsed, accounts: parsed.accounts.map((account) => account.id === "ACC-204" ? { ...account, id: "C-204" } : account.id === "ACC-205" ? { ...account, id: "C-205" } : account) };
          setStore(migrated);
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);

    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as DemoStore;
        if (parsed.version === 1) {
          const migrated = { ...initialDemoStore, ...parsed, accounts: parsed.accounts.map((account) => account.id === "ACC-204" ? { ...account, id: "C-204" } : account.id === "ACC-205" ? { ...account, id: "C-205" } : account) };
          setStore(migrated);
        }
      } catch {
        // Ignore incomplete storage events; the current in-memory state remains usable.
      }
    };
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [ready, store]);

  const updateStore = useCallback((update: (current: DemoStore) => DemoStore) => {
    setStore((current) => update(current));
  }, []);

  if (!ready) return <div className="demo-store-loading" role="status" aria-live="polite">Đang tải dữ liệu Dolores…</div>;
  return <StoreContext.Provider value={{ store, updateStore }}>{children}</StoreContext.Provider>;
}

export function useDemoStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useDemoStore must be used inside DemoStoreProvider");
  return context;
}

export function getDemoContractById(store: DemoStore, id: string) {
  return store.contracts.find((contract) => contract.id === id);
}

export function getMachineType(machineId: string): ContractRecord["machineType"] {
  return machineId.startsWith("S-") || machineId.includes("IOT") ? "Smart IoT" : "Máy thường";
}

export function invoiceAmount(invoice: InvoiceRecord) {
  return invoice.baseFee + invoice.validCups * invoice.paygRate + invoice.otherCharges + invoice.deposit;
}

export function formatDate(date: string) {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("vi-VN");
}

export function businessDueDate(issueDate: string, businessDays = 10) {
  const date = new Date(`${issueDate}T00:00:00`);
  let counted = 0;
  while (counted < businessDays) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0) counted += 1;
  }
  return date.toISOString().slice(0, 10);
}
