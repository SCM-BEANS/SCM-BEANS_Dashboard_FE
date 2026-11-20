import { useQuery } from "@tanstack/react-query";
import { contractsApi } from "@/apis/contracts.api";
import { recallWorkOrdersApi } from "@/apis/recall-work-orders.api";
import { terminationCasesApi } from "@/apis/termination-cases.api";
import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { refundStatusLabels } from "@/components/features/billing/refund-workflow-panel";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { DataTable } from "@/components/table/data-table";
import { Panel } from "@/components/panel/panel";
import { PATH_CUSTOMER } from "@/routes/path";
import type { TerminationCase } from "@/schema/termination-workflow.schema";
import { formatDate, formatMoney, UnavailableIdentity, useOwnerSubject } from "../shared/customer-screen-common";
import styles from "../customer-shell.module.css";

const caseLabels: Record<TerminationCase["status"], string> = {
  REQUESTED: "Chờ xử lý",
  RECOVERY_PENDING: "Đang thu hồi máy",
  INSPECTION_PENDING: "Chờ kiểm tra máy",
  SETTLEMENT_PENDING: "Chờ quyết toán",
  APPROVED: "Đã duyệt quyết toán",
  COMPLETED: "Đã chấm dứt hợp đồng",
  REJECTED: "Đã từ chối",
};

export function ContractEndListScreen({ title, back, completedOnly }: {
  title: string;
  back: BackButtonDestination | null;
  completedOnly: boolean;
}) {
  const { ownerId, checked } = useOwnerSubject();
  const cases = useQuery({
    queryKey: ["dolores", "termination-cases", "owner", ownerId],
    enabled: Boolean(ownerId),
    retry: false,
    queryFn: async ({ signal }) => {
      const contracts = await contractsApi.listByOwner(ownerId!, signal);
      const linkedCases = await Promise.all(contracts.filter((contract) => contract.status !== "DRAFT").map(async (contract) => {
        const expiry = await contractsApi.getExpiry(contract.id, signal);
        if (expiry.contractId && expiry.contractId.toLowerCase() !== contract.id.toLowerCase()) {
          throw new Error("Thông tin hết hạn trả về không khớp hợp đồng.");
        }
        let caseId = expiry.terminationCaseId ?? "";
        if (!caseId) {
          const recalls = await recallWorkOrdersApi.list({ contractId: contract.id, page: 0, size: 100 }, signal);
          const sorted = [...recalls.content].sort((left, right) => Date.parse(right.createdAt ?? "") - Date.parse(left.createdAt ?? ""));
          caseId = sorted.find((order) => order.status !== "CANCELLED")?.terminationCaseId ?? sorted[0]?.terminationCaseId ?? "";
        }
        if (!caseId) return null;
        const item = await terminationCasesApi.getById(caseId, signal);
        if (item.contractId.toLowerCase() !== contract.id.toLowerCase() || item.ownerId.toLowerCase() !== ownerId!.toLowerCase()) {
          throw new Error("Hồ sơ chấm dứt được liên kết không thuộc hợp đồng của tài khoản.");
        }
        return item;
      }));
      return linkedCases.filter((item): item is TerminationCase => item !== null);
    },
  });
  const rows = (cases.data ?? []).filter((item) => !completedOnly || (item.refundId && item.refundStatus === "COMPLETED"))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const failed = cases.isError;
  const loading = !checked || cases.isPending;

  if (checked && !ownerId) return <UnavailableIdentity title={title} />;

  return (
    <section className={styles.pageContent} aria-labelledby="owner-contract-end-title">
      <BackButtonHeading back={back} title={title} titleId="owner-contract-end-title" className={styles.pageHeading} />
      <Panel aria-label={title}>
        {loading && <p className={styles.loadingNotice} role="status">Đang tải hồ sơ…</p>}
        {failed && <div className={styles.errorNotice} role="alert">
          <p>Chưa tải được danh sách hồ sơ. Vui lòng thử lại.</p>
          <ButtonBar type="button" onClick={() => void cases.refetch()}>Thử lại</ButtonBar>
        </div>}
        {rows.length > 0 && <DataTable rows={rows} rowKey={(item) => item.id} columns={[
          { key: "contract", header: "Hợp đồng", kind: "code", noWrap: true, render: (item) => <TextLinkButton href={`${PATH_CUSTOMER.CONTRACT_TERMINATION(item.contractId)}?caseId=${encodeURIComponent(item.id)}`}>{item.contractId.slice(0, 8).toUpperCase()}</TextLinkButton> },
          { key: "machine", header: "Máy", kind: "name", render: (item) => item.machineSerialNumber || item.machineModelName || item.machineId.slice(0, 8).toUpperCase() },
          ...(!completedOnly ? [{ key: "status", header: "Hồ sơ", kind: "status" as const, render: (item: TerminationCase) => <StatusBadge variant="dot" status={item.status}>{caseLabels[item.status]}</StatusBadge> }] : []),
          { key: "refund", header: "Hoàn cọc", render: (item) => item.refundStatus ? refundStatusLabels[item.refundStatus] : item.depositRefundAmount === 0 ? "Không phát sinh" : "Chưa có khoản hoàn" },
          { key: "amount", header: "Số tiền hoàn", kind: "amount", align: "right", render: (item) => formatMoney(item.depositRefundAmount) },
          { key: "updated", header: "Cập nhật hồ sơ", kind: "date", render: (item) => formatDate(item.updatedAt) },
        ]} />}
        {!loading && !failed && rows.length === 0 && <p className={styles.emptyNotice} role="status">
          {completedOnly ? "Chưa có khoản hoàn cọc đã hoàn tất." : "Chưa có hồ sơ chấm dứt hợp đồng."}
        </p>}
      </Panel>
      <div><TextLinkButton href={completedOnly ? PATH_CUSTOMER.CONTRACT_END : PATH_CUSTOMER.CONTRACT_DEPOSIT_COMPLETE}>
        {completedOnly ? "Theo dõi kết thúc hợp đồng và hoàn cọc" : "Xem hoàn cọc đã hoàn tất"}
      </TextLinkButton></div>
    </section>
  );
}
