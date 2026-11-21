import { useState } from "react";
import { TextLinkButton } from "@/components/button/text-link-button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ContractTable } from "@/components/table/contract-table";
import { TableFilters } from "@/components/table/table-filters";
import { Panel } from "@/components/panel/panel";
import { ContractListPanel, ContractListPagination } from "@/components/contracts/contract-list-panel";
import { ContractOverviewPanel } from "@/components/contracts/contract-overview-panel";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { contractsApi } from "@/apis/contracts.api";
import { recallWorkOrdersApi } from "@/apis/recall-work-orders.api";
import { machinesApi } from "@/apis/machines.api";
import { ContractIdSchema, type Contract } from "@/schema/contracts.schema";
import { PATH_CUSTOMER } from "@/routes/path";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { CONTRACT_LIST_MESSAGES as CONTRACT_LIST_T } from "@/text/contracts/contract-messages";
import { DetailItem, formatDate, QueryFeedback, UnavailableIdentity, useOwnerSubject } from "../shared/customer-screen-common";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;
const PAGE_SIZE = 10;

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function contractStatusLabel(contract: Contract) {
  if (contract.status === "DRAFT") return "Chờ hiệu lực";
  if (contract.status === "TERMINATED") return "Đã kết thúc";
  if (!contract.endDate) return "Đang hiệu lực";

  const endDate = new Date(`${contract.endDate}T23:59:59`);
  if (Number.isNaN(endDate.getTime())) return "Đang hiệu lực";
  const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / 86_400_000);
  if (daysRemaining < 0) return "Đã hết hạn";
  if (daysRemaining <= 31) return "Còn 1 tháng";
  return "Đang hiệu lực";
}

export function ContractsScreen({ sectionPath, back }: { sectionPath: string; back?: BackButtonDestination | null }) {
  const queryClient = useQueryClient();
  const { ownerId, checked } = useOwnerSubject();
  const [page, setPage] = useState(0);
  const [filterDraft, setFilterDraft] = useState({ search: "", status: "", machineType: "" });
  const [filters, setFilters] = useState(filterDraft);
  const contractCandidate = sectionPath.startsWith("contracts/")
    ? sectionPath.slice("contracts/".length)
    : "";
  const contractId = ContractIdSchema.safeParse(contractCandidate).success ? contractCandidate : null;
  const isExpiryList = sectionPath === "contracts/expiry";
  const isList = sectionPath === "contracts" || isExpiryList;
  const list = useQuery({
    queryKey: ["owner-contracts", ownerId],
    queryFn: ({ signal }) => contractsApi.listByOwner(ownerId!, signal),
    enabled: Boolean(ownerId && isList),
  });
  const machines = useQuery({
    queryKey: ["owner-machines"],
    queryFn: ({ signal }) => machinesApi.list(signal),
    enabled: Boolean(ownerId && isList),
  });
  const detail = useQuery({
    queryKey: ["owner-contract", contractId],
    queryFn: ({ signal }) => contractsApi.getById(contractId!, signal),
    enabled: Boolean(contractId),
  });
  const expiry = useQuery({
    queryKey: ["owner-contract-expiry", contractId],
    queryFn: ({ signal }) => contractsApi.getExpiry(contractId!, signal),
    enabled: Boolean(contractId),
  });
  const recallOrders = useQuery({
    queryKey: ["dolores", "recall-work-orders", "contract", contractId],
    queryFn: ({ signal }) => recallWorkOrdersApi.list({ contractId: contractId!, page: 0, size: 100 }, signal),
    enabled: Boolean(contractId && detail.data),
    retry: false,
  });
  const sortedRecallOrders = [...(recallOrders.data?.content ?? [])]
    .sort((left, right) => Date.parse(right.createdAt ?? "") - Date.parse(left.createdAt ?? ""));
  const latestRecall = sortedRecallOrders.find((order) => order.status !== "CANCELLED") ?? sortedRecallOrders[0];
  const hasTerminationCase = Boolean(expiry.data?.terminationCaseId || latestRecall?.terminationCaseId);
  const recordExpiryDecision = useMutation({
    mutationFn: (decision: "CONTINUE" | "DO_NOT_CONTINUE") =>
      contractsApi.recordExpiryDecision(contractId!, { decision }),
    onSuccess: async (result) => {
      queryClient.setQueryData(["owner-contract-expiry", contractId], result);
      await queryClient.invalidateQueries({ queryKey: ["owner-contract", contractId] });
    },
  });

  if (!checked && isList) {
    return (
      <section className={styles.pageContent} aria-labelledby="customer-screen-title">
        <BackButtonHeading title={CONTRACT_LIST_T.PAGE_TITLE} titleId="customer-screen-title" className={styles.pageHeading} back={null} />
        <div className={styles.loadingNotice} role="status">{messages.LOADING}</div>
      </section>
    );
  }
  if (!ownerId && isList) {
    return <UnavailableIdentity title={messages.CONTRACTS_TITLE} />;
  }

  const machineById = new Map((machines.data ?? []).map((machine) => [machine.id, machine] as const));
  const contracts = (list.data ?? []).filter((contract) => {
    const machine = contract.machineId ? machineById.get(contract.machineId) : undefined;
    const matchesSearch = `${contract.id} ${machine?.serialNumber ?? ""}`.toLocaleLowerCase("vi-VN").includes(filters.search.toLocaleLowerCase("vi-VN"));
    return matchesSearch && (!filters.status || contract.status === filters.status)
      && (!filters.machineType || (contract.machineTypeSnapshot ?? machine?.machineType) === filters.machineType);
  });
  const isListLoading = !list.isError && list.isPending;
  const visibleContracts = contracts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const expiryDate = expiry.data?.expiryDate ?? detail.data?.endDate ?? null;
  const businessToday = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  const canRecordExpiryDecision = detail.data?.status === "ACTIVE"
    && !detail.data.legacyUnmapped
    && expiry.isSuccess
    && Boolean(expiryDate && expiryDate >= businessToday)
    && !expiry.data?.decision;
  const expiryDecisionLabel = expiry.data?.decision === "CONTINUE"
    ? "Muốn tiếp tục thuê (chưa gia hạn)"
    : expiry.data?.decision === "DO_NOT_CONTINUE"
      ? "Không tiếp tục thuê"
      : expiry.data?.decision === "NO_RESPONSE"
        ? "Chưa phản hồi đúng hạn"
        : null;
  return (
    <section className={`${styles.pageContent} ${styles.contractPage}`} aria-labelledby="customer-screen-title">
      <BackButtonHeading
        back={back ?? null}
        title={contractId ? "Hồ sơ hợp đồng" : isExpiryList ? messages.CONTRACT_EXPIRY_TITLE : CONTRACT_LIST_T.PAGE_TITLE}
        titleId="customer-screen-title"
        className={styles.pageHeading}
      />
      {contractId ? (
        <>
          <QueryFeedback loading={detail.isPending} failed={detail.isError} empty={!detail.data} emptyText={messages.NO_CONTRACTS} />
          {detail.data ? (
            <div className={styles.contractLayout}>
              <ContractOverviewPanel contract={detail.data} ownerName={messages.CONTRACT_OWNER_SCOPE} />
              <Panel aria-labelledby="contract-expiry-title">
                <h2 id="contract-expiry-title">Hạn hợp đồng và ý định tiếp tục</h2>
                {expiry.isPending ? <p className={styles.loadingNotice} role="status">Đang tải thông tin hết hạn…</p> : null}
                {expiry.isError ? <p className={styles.errorNotice} role="alert">Không tải được thông tin hết hạn của hợp đồng.</p> : null}
                {expiry.data ? (
                  <>
                    <dl className={styles.detailGrid}>
                      <DetailItem label="Ngày hết hạn" value={formatDate(expiry.data.expiryDate ?? detail.data.endDate)} />
                      <DetailItem label="Ngày nhắc dự kiến" value={formatDate(expiry.data.reminderDate)} />
                      <DetailItem label="Thời điểm đã ghi nhận" value={expiry.data.decidedAt ? formatDateTime(expiry.data.decidedAt) : "Chưa có"} />
                    </dl>
                    {expiryDecisionLabel ? (
                      <p className={styles.successNotice} role="status">
                        {expiryDecisionLabel}. Quyết định đầu tiên được lưu cố định.
                      </p>
                    ) : null}
                    {canRecordExpiryDecision ? (
                      <>
                        <p>Hãy chọn ý định trước ngày hết hạn. Lựa chọn đầu tiên không thể đổi; “tiếp tục thuê” chưa tự gia hạn hợp đồng.</p>
                        {recordExpiryDecision.isError ? (
                          <p className={styles.errorNotice} role="alert">
                            Không ghi nhận được lựa chọn. Hợp đồng có thể đã hết hạn hoặc đã có quyết định khác; hãy tải lại trạng thái.
                          </p>
                        ) : null}
                        <div className={styles.workflowActions}>
                          <ButtonBar
                            variant="primary"
                            type="button"
                            disabled={recordExpiryDecision.isPending}
                            onClick={() => recordExpiryDecision.mutate("CONTINUE")}
                          >
                            {recordExpiryDecision.isPending ? "Đang ghi nhận…" : "Ghi nhận muốn tiếp tục"}
                          </ButtonBar>
                          <ButtonBar
                            type="button"
                            disabled={recordExpiryDecision.isPending}
                            onClick={() => recordExpiryDecision.mutate("DO_NOT_CONTINUE")}
                          >
                            Không tiếp tục thuê
                          </ButtonBar>
                        </div>
                      </>
                    ) : null}
                  </>
                ) : null}
              </Panel>
              {hasTerminationCase || detail.data.status === "TERMINATED" || (recallOrders.isError && detail.data.status === "ACTIVE") ? (
                <Panel className={styles.contractRelated} aria-labelledby="owner-termination-link-title">
                  <h2 id="owner-termination-link-title"><TextLinkButton href={PATH_CUSTOMER.CONTRACT_TERMINATION(detail.data.id)}>Hồ sơ chấm dứt hợp đồng</TextLinkButton></h2>
                </Panel>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <ContractListPanel count={list.data ? contracts.length : undefined}>
          <TableFilters
            search={{
              ariaLabel: CONTRACT_LIST_T.SEARCH_LABEL,
              placeholder: CONTRACT_LIST_T.SEARCH_LABEL,
              value: filterDraft.search,
              maxLength: 100,
              onChange: (search) => setFilterDraft((current) => ({ ...current, search })),
            }}
            selects={[{
              id: "contract-status",
              ariaLabel: CONTRACT_LIST_T.STATUS_FILTER,
              value: filterDraft.status,
              options: [
                { value: "", label: CONTRACT_LIST_T.STATUS_ALL },
                { value: "ACTIVE", label: CONTRACT_LIST_T.STATUS_ACTIVE },
                { value: "DRAFT", label: CONTRACT_LIST_T.STATUS_DRAFT },
                { value: "TERMINATED", label: CONTRACT_LIST_T.STATUS_TERMINATED },
              ],
              onChange: (status) => setFilterDraft((current) => ({ ...current, status })),
            }, {
              id: "contract-machine-type",
              ariaLabel: CONTRACT_LIST_T.MACHINE_TYPE_FILTER,
              value: filterDraft.machineType,
              options: [
                { value: "", label: CONTRACT_LIST_T.MACHINE_TYPE_ALL },
                { value: "CONVENTIONAL", label: CONTRACT_LIST_T.MACHINE_TYPE_CONVENTIONAL },
                { value: "SMART_IOT", label: CONTRACT_LIST_T.MACHINE_TYPE_SMART },
              ],
              onChange: (machineType) => setFilterDraft((current) => ({ ...current, machineType })),
            }]}
            submitLabel={CONTRACT_LIST_T.SEARCH_SUBMIT}
            onSubmit={(event) => {
              event.preventDefault();
              setFilters({ ...filterDraft, search: filterDraft.search.trim() });
              setPage(0);
            }}
          />
          {isListLoading ? <div className={styles.loadingNotice} role="status">{messages.LOADING}</div> : null}
          {list.isError ? <div className={styles.errorNotice} role="alert">{messages.LOAD_ERROR}</div> : null}
          {!isListLoading && !list.isError && contracts.length === 0 ? (
            <div className={styles.emptyNotice} role="status">{messages.NO_CONTRACTS}</div>
          ) : null}
          {!isListLoading && !list.isError && contracts.length > 0 ? (
            <>
              <ContractTable
                contracts={visibleContracts}
                contractHref={PATH_CUSTOMER.CONTRACT_DETAIL}
                ownerName={() => messages.CONTRACT_OWNER_SCOPE}
                machineLabel={(contract) => {
                  const machine = contract.machineId ? machineById.get(contract.machineId) : undefined;
                  return machine?.serialNumber ?? (contract.machineId ? <TruncatedId value={contract.machineId} /> : "—");
                }}
                machineTypeLabel={(contract) => {
                  const machineType = contract.machineTypeSnapshot ?? (contract.machineId ? machineById.get(contract.machineId)?.machineType : undefined);
                  return machineType === "SMART_IOT" ? "Smart IoT" : machineType === "CONVENTIONAL" ? "Máy thường" : "—";
                }}
                statusLabel={contractStatusLabel}
                contractHeader={isExpiryList ? "Hợp đồng cần xem hạn" : undefined}
              />
              <ContractListPagination
                page={page}
                pageSize={PAGE_SIZE}
                totalCount={contracts.length}
                onPageChange={setPage}
              />
            </>
          ) : null}
        </ContractListPanel>
      )}
    </section>
  );
}
