import { PageActions } from "@/components/action-bar/page-actions";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { useState } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { TextLinkButton } from "@/components/button/text-link-button";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { DataTable, type DataTableColumn } from "@/components/table/data-table";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { EvidenceList } from "@/components/evidence/evidence-list";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_MODERATOR, PATH_TECHNICIAN } from "@/routes/path";
import { type BuybackCase, type BuybackCaseSummary as BuybackCaseSummaryType } from "@/schema/buybacks.schema";
import { buybackStatusLabels, formatBuybackDateTime, formatBuybackMoney } from "./buyback-formatters";
import type { BuybackWorkflowController, BuybackWorkflowRole } from "./buyback-workflow-controller";
import styles from "../repair-workflow/repair-workflow.module.css";

export function BuybackWorkflowLayout({
  title,
  description,
  back,
  actionBarBackHref,
  actionBarBackLabel = "Quay lại danh sách",
  children,
}: {
  title: string;
  description: string;
  back?: BackButtonDestination | null;
  actionBarBackHref?: string;
  actionBarBackLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${styles.screen} ${styles.pageContent}`} aria-labelledby="buyback-title">
      <BackButtonHeading
        title={title}
        titleId="buyback-title"
        description={description}
        back={back ?? (actionBarBackHref ? { label: actionBarBackLabel, fallbackHref: actionBarBackHref } : null)}
      />
      {children}
    </section>
  );
}

export function BuybackCaseList({ workflow }: { workflow: BuybackWorkflowController }) {
  const { list, showList, role, operatorRole, page, setPage } = workflow;
  const [acceptanceCase, setAcceptanceCase] = useState<BuybackCaseSummaryType | null>(null);
  const [valuationDecision, setValuationDecision] = useState<{ item: BuybackCaseSummaryType; approved: boolean } | null>(null);
  const [valuationReason, setValuationReason] = useState("");
  const [ownerDecision, setOwnerDecision] = useState<{ item: BuybackCaseSummaryType; accepted: boolean } | null>(null);
  const [ownerDecisionReason, setOwnerDecisionReason] = useState("");
  const [collectionRequestCase, setCollectionRequestCase] = useState<BuybackCaseSummaryType | null>(null);
  const [collectionRequestReason, setCollectionRequestReason] = useState("");
  if (!showList) return null;
  const acceptInspection = async (item: BuybackCaseSummaryType) => {
    const key = workflow.operationKey("inspection-start", item.id);
    try {
      await workflow.startInspection.mutateAsync({
        id: item.id,
        reason: "Technician xác nhận tiếp nhận hồ sơ thu mua để bắt đầu kiểm tra máy.",
        idempotencyKey: key,
        correlationId: key,
      });
      setAcceptanceCase(null);
    } catch {
      // Keep the confirmation open so the technician can read the API error or retry.
    }
  };
  const closeAcceptanceDialog = () => {
    if (!workflow.startInspection.isPending) setAcceptanceCase(null);
  };
  const openValuationDialog = (item: BuybackCaseSummaryType, approved: boolean) => {
    workflow.decideValuation.reset();
    setValuationReason("");
    setValuationDecision({ item, approved });
  };
  const closeValuationDialog = () => {
    if (workflow.decideValuation.isPending) return;
    setValuationDecision(null);
    setValuationReason("");
  };
  const submitValuationDecision = () => {
    const decision = valuationDecision;
    const reason = valuationReason.trim();
    if (!decision || !reason || workflow.decideValuation.isPending) return;
    const proposedPrice = decision.item.proposedPrice;
    if (decision.approved && (proposedPrice == null || !Number.isFinite(proposedPrice) || proposedPrice <= 0)) return;
    const key = workflow.operationKey(
      "valuation-decision",
      decision.item.id,
      JSON.stringify({ approved: decision.approved, approvedPrice: decision.approved ? proposedPrice : undefined, reason }),
    );
    workflow.decideValuation.mutate({
      id: decision.item.id,
      approved: decision.approved,
      ...(decision.approved ? { approvedPrice: proposedPrice! } : {}),
      reason,
      idempotencyKey: key,
      correlationId: key,
    }, {
      onSuccess: () => {
        setValuationDecision(null);
        setValuationReason("");
      },
    });
  };
  const openOwnerDecisionDialog = (item: BuybackCaseSummaryType, accepted: boolean) => {
    workflow.decideOwnerPrice.reset();
    setOwnerDecisionReason("");
    setOwnerDecision({ item, accepted });
  };
  const closeOwnerDecisionDialog = () => {
    if (workflow.decideOwnerPrice.isPending) return;
    setOwnerDecision(null);
    setOwnerDecisionReason("");
  };
  const submitOwnerDecision = () => {
    const decision = ownerDecision;
    const reason = ownerDecisionReason.trim();
    if (!decision || !reason || workflow.decideOwnerPrice.isPending) return;
    const approvedPrice = decision.item.approvedPrice;
    if (decision.item.status !== "APPROVED" || decision.item.ownerAccepted != null || approvedPrice == null || !Number.isFinite(approvedPrice) || approvedPrice <= 0) return;
    const operation = decision.accepted ? "owner-decision-accept" : "owner-decision-reject";
    const key = workflow.operationKey(operation, decision.item.id, JSON.stringify({ accepted: decision.accepted, reason }));
    workflow.decideOwnerPrice.mutate({
      id: decision.item.id,
      accepted: decision.accepted,
      reason,
      idempotencyKey: key,
      correlationId: key,
    }, {
      onSuccess: () => {
        setOwnerDecision(null);
        setOwnerDecisionReason("");
      },
    });
  };
  const canRequestCollectionForItem = (item: BuybackCaseSummaryType) => Boolean(
    role === "operator"
      && (operatorRole === "ADMIN" || (operatorRole === "MODERATOR" && item.responsibleModeratorId === workflow.ownerId))
      && item.workflowVersion === 2
      && item.status === "APPROVED"
      && item.ownerAccepted === true
      && Number(item.acceptedPrice) > 0
      && Number(item.acceptedPrice) === Number(item.approvedPrice),
  );
  const canAssignCollectionForItem = (item: BuybackCaseSummaryType) => Boolean(
    role === "operator"
      && operatorRole === "MODERATOR"
      && item.responsibleModeratorId === workflow.ownerId
      && item.workflowVersion === 2
      && item.status === "COLLECTION_PENDING"
      && Boolean(item.inspectionTechnicianId)
      && !item.collectionTechnicianId,
  );
  const openCollectionRequestDialog = (item: BuybackCaseSummaryType) => {
    workflow.requestCollection.reset();
    setCollectionRequestReason("");
    setCollectionRequestCase(item);
  };
  const closeCollectionRequestDialog = () => {
    if (workflow.requestCollection.isPending) return;
    setCollectionRequestCase(null);
    setCollectionRequestReason("");
  };
  const submitCollectionRequest = () => {
    const requestCase = collectionRequestCase;
    const reason = collectionRequestReason.trim();
    if (!requestCase || !reason || workflow.requestCollection.isPending || !canRequestCollectionForItem(requestCase)) return;
    const key = workflow.operationKey("collection-request", requestCase.id, reason);
    workflow.requestCollection.mutate({ id: requestCase.id, reason, idempotencyKey: key, correlationId: key }, {
      onSuccess: () => {
        setCollectionRequestCase(null);
        setCollectionRequestReason("");
      },
    });
  };
  const statusLabel = (item: BuybackCaseSummaryType) => {
    if (role === "owner" && item.status === "VALUATION_PENDING") {
      return "Đang chờ duyệt";
    }
    if (item.status === "COLLECTION_PENDING" && item.collectionTechnicianId) {
      return "Đang thu máy";
    }
    if (item.status === "APPROVED" && item.ownerAccepted === true) {
      return "Chờ thu máy";
    }
    if (workflow.isModeratorRoute && item.status === "REQUESTED" && !item.inspectionTechnicianId) {
      return "Chưa phân công tech";
    }
    if (workflow.isModeratorRoute && item.status === "INSPECTION_PENDING") {
      return "Chờ đánh giá thiết bị";
    }
    return buybackStatusLabels[item.status];
  };
  const caseDetailsHref = (caseId: string) => {
    if (workflow.isModeratorRoute) return PATH_MODERATOR.BUYBACK_DETAIL(caseId);
    if (role === "technician") return PATH_TECHNICIAN.TASK_BUYBACK_ASSESSMENT_DETAIL(caseId);
    const listRoute = workflow.backHref;
    return `${listRoute}?caseId=${encodeURIComponent(caseId)}`;
  };
  const listColumns: DataTableColumn<BuybackCaseSummaryType>[] = [
    {
      key: "case-id",
      header: "Mã hồ sơ",
      render: (item) => <TextLinkButton href={caseDetailsHref(item.id)}><TruncatedId value={item.id} /></TextLinkButton>,
    },
    {
      key: "machine",
      header: "Thiết bị",
      render: (item) => item.machineSerialNumber ?? item.assetSerial ?? (item.machineId ? <>Máy <TruncatedId value={item.machineId} /></> : "Chờ kiểm tra"),
    },
    {
      key: "price",
      header: "Giá thu mua",
      render: (item) => {
        const price = role === "owner"
          ? item.approvedPrice
          : item.status === "VALUATION_PENDING"
            ? item.proposedPrice ?? item.approvedPrice ?? item.acceptedPrice ?? item.requestedPrice
            : item.acceptedPrice ?? item.approvedPrice ?? item.proposedPrice ?? item.requestedPrice;
        return price == null ? "Chưa định giá" : formatBuybackMoney(price, item.currency);
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item) => <span className={styles.buybackStatus}>{statusLabel(item)}</span>,
    },
    {
      key: "updated-at",
      header: "Cập nhật",
      render: (item) => formatBuybackDateTime(item.updatedAt),
    },
  ];
  if (role === "technician") {
    listColumns.push({
      key: "accept",
      header: "",
      align: "right",
      render: (item) => {
        if (item.status === "INSPECTION_PENDING") {
          return (
            <ButtonBar className={styles.buybackDetailAction} href={PATH_TECHNICIAN.TASK_BUYBACK_ASSESSMENT_DETAIL(item.id)}>
              Đánh giá
            </ButtonBar>
          );
        }
        if (
          item.workflowVersion === 2
          && item.status === "COLLECTION_PENDING"
          && workflow.ownerId
          && item.collectionTechnicianId === workflow.ownerId
        ) {
          return (
            <ButtonBar className={styles.buybackDetailAction} href={PATH_TECHNICIAN.TASK_BUYBACK_ASSESSMENT_DETAIL(item.id)}>
              Thu máy
            </ButtonBar>
          );
        }
        if (
          item.workflowVersion === 2
          && item.status === "PAID"
          && workflow.ownerId
          && item.refurbishmentTechnicianId === workflow.ownerId
        ) {
          return (
            <ButtonBar className={styles.buybackDetailAction} href={PATH_TECHNICIAN.TASK_BUYBACK_ASSESSMENT_DETAIL(item.id)}>
              Tân trang
            </ButtonBar>
          );
        }
        if (
          item.workflowVersion === 2
          && item.status === "REFURBISHING"
          && workflow.ownerId
          && item.refurbishmentTechnicianId === workflow.ownerId
        ) {
          return (
            <ButtonBar className={styles.buybackDetailAction} href={PATH_TECHNICIAN.TASK_BUYBACK_ASSESSMENT_DETAIL(item.id)}>
              Tiếp tục tân trang
            </ButtonBar>
          );
        }
        if (item.status !== "REQUESTED") return null;
        const canAccept = item.contractId != null
          || Boolean(workflow.ownerId && item.inspectionTechnicianId === workflow.ownerId);
        return (
          <button
            className={styles.buybackDetailAction}
            type="button"
            aria-label={canAccept ? `Tiếp nhận hồ sơ ${item.id}` : `Hồ sơ ${item.id} chưa được giao cho bạn`}
            disabled={!canAccept || workflow.startInspection.isPending}
            onClick={() => { if (canAccept) setAcceptanceCase(item); }}
          >
            {canAccept ? "Tiếp nhận" : "Chưa được giao"}
          </button>
        );
      },
    });
  }
  if (role === "operator" && (operatorRole === "ADMIN" || operatorRole === "MODERATOR")) {
    listColumns.push({
      key: "operator-actions",
      header: "Thao tác",
      align: "right",
      render: (item) => {
        if (item.status === "VALUATION_PENDING") {
          return (
            <div className={styles.technicalRequestActions}>
              <button
                className={styles.technicalRequestAccept}
                type="button"
                disabled={workflow.decideValuation.isPending || item.proposedPrice == null || !Number.isFinite(item.proposedPrice) || item.proposedPrice <= 0}
                onClick={() => openValuationDialog(item, true)}
              >
                Duyệt giá
              </button>
              <button
                className={styles.technicalRequestReject}
                type="button"
                disabled={workflow.decideValuation.isPending}
                onClick={() => openValuationDialog(item, false)}
              >
                Không duyệt
              </button>
            </div>
          );
        }
        if (canRequestCollectionForItem(item)) {
          return (
            <button
              className={styles.technicalRequestAccept}
              type="button"
              disabled={workflow.requestCollection.isPending}
              onClick={() => openCollectionRequestDialog(item)}
            >
              Yêu cầu thu máy
            </button>
          );
        }
        if (canAssignCollectionForItem(item)) {
          return (
            <ButtonBar className={styles.buybackDetailAction} href={caseDetailsHref(item.id)}>
              Phân công thu máy
            </ButtonBar>
          );
        }
        return null;
      },
    });
  }
  if (role === "owner") {
    listColumns.push({
      key: "owner-decision-actions",
      header: "Thao tác",
      align: "right",
      render: (item) => item.status === "APPROVED"
        && Number(item.approvedPrice) > 0
        && item.ownerAccepted == null ? (
          <div className={styles.technicalRequestActions}>
            <button
              className={styles.technicalRequestAccept}
              type="button"
              disabled={workflow.decideOwnerPrice.isPending}
              onClick={() => openOwnerDecisionDialog(item, true)}
            >
              Chấp nhận giá
            </button>
            <button
              className={styles.technicalRequestReject}
              type="button"
              disabled={workflow.decideOwnerPrice.isPending}
              onClick={() => openOwnerDecisionDialog(item, false)}
            >
              Từ chối giá
            </button>
          </div>
        ) : null,
    });
  }

  return (
    <>
      {list.isPending ? <p className={styles.notice} role="status">Đang tải hồ sơ thu mua…</p> : null}
      {list.isError ? (
        <div className={`${styles.notice} ${styles.error}`} role="alert">
          <p>{getApiErrorMessage(list.error)}</p>
          <ButtonBar type="button" onClick={() => void list.refetch()}>Thử lại</ButtonBar>
        </div>
      ) : null}
      {!list.isPending && !list.isError && list.data?.items.length === 0 ? (
        <p className={styles.notice} role="status">Chưa có hồ sơ trong phạm vi tài khoản.</p>
      ) : null}
      {list.data?.items.length ? (
        <section className={styles.panel} aria-label="Danh sách hồ sơ thu mua">
          <h2 className={styles.sectionTitle}>Hồ sơ</h2>
          <DataTable
            columns={listColumns}
            rows={list.data.items}
            rowKey={(item) => item.id}
            variant={role === "owner" ? "customer" : operatorRole === "MODERATOR" ? "moderator" : "operations"}
            emptyMessage="Chưa có hồ sơ thu mua."
          />
          <div className={styles.technicalRequestActions}>
            <ButtonBar type="button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Trang trước</ButtonBar>
            <span>Trang {list.data.page + 1}</span>
            <ButtonBar type="button" disabled={!list.data.hasNext} onClick={() => setPage((value) => value + 1)}>Trang sau</ButtonBar>
          </div>
        </section>
      ) : null}
      {acceptanceCase ? (
        <NotificationDialog
          variant="confirm"
          eyebrow="Hồ sơ thu mua"
          title="Xác nhận tiếp nhận hồ sơ?"
          description="Xác nhận để chuyển hồ sơ sang bước kiểm tra máy."
          primaryAction={{
            label: "Tiếp nhận",
            pending: workflow.startInspection.isPending,
            pendingLabel: "Đang tiếp nhận…",
            onClick: () => void acceptInspection(acceptanceCase),
          }}
          secondaryAction={{
            label: "Quay lại",
            disabled: workflow.startInspection.isPending,
            onClick: closeAcceptanceDialog,
          }}
          onClose={closeAcceptanceDialog}
          closeOnEscape={!workflow.startInspection.isPending}
        >
          <p className={styles.formHint}>Mã hồ sơ: <span className={styles.codeValue}><TruncatedId value={acceptanceCase.id} /></span></p>
          {workflow.startInspection.isError ? <BuybackErrorNotice error={workflow.startInspection.error} /> : null}
        </NotificationDialog>
      ) : null}
      {valuationDecision ? (
        <NotificationDialog
          variant="confirm"
          eyebrow="Hồ sơ thu mua"
          title={valuationDecision.approved ? "Duyệt giá Technician đề xuất?" : "Không duyệt giá Technician đề xuất?"}
          description={valuationDecision.approved
            ? `Xác nhận duyệt theo giá ${formatBuybackMoney(valuationDecision.item.proposedPrice, valuationDecision.item.currency)} do Technician đề xuất.`
            : `Xác nhận không duyệt giá ${formatBuybackMoney(valuationDecision.item.proposedPrice, valuationDecision.item.currency)} do Technician đề xuất.`}
          primaryAction={{
            label: valuationDecision.approved ? "Duyệt giá" : "Không duyệt",
            pending: workflow.decideValuation.isPending,
            pendingLabel: "Đang cập nhật…",
            disabled: !valuationReason.trim(),
            onClick: submitValuationDecision,
          }}
          secondaryAction={{ label: "Quay lại", disabled: workflow.decideValuation.isPending, onClick: closeValuationDialog }}
          onClose={closeValuationDialog}
          closeOnEscape={!workflow.decideValuation.isPending}
        >
          <label className={styles.formField}>
            <span>Lý do quyết định</span>
            <textarea required maxLength={2000} value={valuationReason} onChange={(event) => setValuationReason(event.target.value)} />
          </label>
          {workflow.decideValuation.isError ? <BuybackErrorNotice error={workflow.decideValuation.error} /> : null}
        </NotificationDialog>
      ) : null}
      {ownerDecision ? (
        <NotificationDialog
          variant="confirm"
          eyebrow="Hồ sơ thu mua"
          title={ownerDecision.accepted ? "Chấp nhận giá đã duyệt?" : "Từ chối giá đã duyệt?"}
          description={(ownerDecision.accepted ? "Xác nhận chấp nhận" : "Xác nhận từ chối")
            + " mức giá "
            + formatBuybackMoney(ownerDecision.item.approvedPrice, ownerDecision.item.currency)
            + " đã được duyệt."}
          primaryAction={{
            label: ownerDecision.accepted ? "Chấp nhận giá" : "Từ chối giá",
            pending: workflow.decideOwnerPrice.isPending,
            pendingLabel: "Đang gửi quyết định…",
            disabled: !ownerDecisionReason.trim(),
            onClick: submitOwnerDecision,
          }}
          secondaryAction={{ label: "Quay lại", disabled: workflow.decideOwnerPrice.isPending, onClick: closeOwnerDecisionDialog }}
          onClose={closeOwnerDecisionDialog}
          closeOnEscape={!workflow.decideOwnerPrice.isPending}
        >
          <label className={styles.formField}>
            <span>Lý do chấp nhận hoặc từ chối</span>
            <textarea required maxLength={2000} value={ownerDecisionReason} onChange={(event) => setOwnerDecisionReason(event.target.value)} />
          </label>
          {workflow.decideOwnerPrice.isError ? <BuybackErrorNotice error={workflow.decideOwnerPrice.error} /> : null}
        </NotificationDialog>
      ) : null}
      {collectionRequestCase ? (
        <NotificationDialog
          variant="confirm"
          eyebrow="Điều phối thu máy"
          title="Gửi yêu cầu thu máy?"
          description="Owner đã chấp nhận giá được duyệt. Xác nhận để chuyển hồ sơ sang COLLECTION_PENDING, sau đó phân công Technician đến thu máy."
          primaryAction={{
            label: "Yêu cầu thu máy",
            pending: workflow.requestCollection.isPending,
            pendingLabel: "Đang gửi yêu cầu…",
            disabled: !collectionRequestReason.trim(),
            onClick: submitCollectionRequest,
          }}
          secondaryAction={{ label: "Quay lại", disabled: workflow.requestCollection.isPending, onClick: closeCollectionRequestDialog }}
          onClose={closeCollectionRequestDialog}
          closeOnEscape={!workflow.requestCollection.isPending}
        >
          <p className={styles.formHint}>Giá đã duyệt: {formatBuybackMoney(collectionRequestCase.approvedPrice, collectionRequestCase.currency)}</p>
          <label className={styles.formField}>
            <span>Lý do / hướng dẫn thu máy</span>
            <textarea required maxLength={2000} value={collectionRequestReason} onChange={(event) => setCollectionRequestReason(event.target.value)} />
          </label>
          {workflow.requestCollection.isError ? <BuybackErrorNotice error={workflow.requestCollection.error} /> : null}
        </NotificationDialog>
      ) : null}
    </>
  );
}

export function BuybackCreatePanel({ workflow }: { workflow: BuybackWorkflowController }) {
  const router = useRouter();
  const { createFormOpen, ownerId, contracts, hasActiveContract, createConfirmed, setCreateConfirmed, create, submitCreate } = workflow;
  if (!createFormOpen) return null;

  return (
    <section className={styles.panel} aria-labelledby="buyback-create-title">
      <h2 id="buyback-create-title" className={styles.sectionTitle}>Mở hồ sơ thu mua máy cũ</h2>
      <p className={styles.formHint}>Dolores sẽ kiểm tra máy và gửi giá để bạn quyết định. Tài khoản cần có ít nhất một hợp đồng đang hoạt động. Ở bước này, BE chỉ nhận yêu cầu mở hồ sơ; thông tin máy và giá sẽ được bổ sung sau khi Technician kiểm tra.</p>
      {!ownerId ? <p className={styles.notice} role="alert">Không xác định được Owner đăng nhập.</p> : null}
      {contracts.isPending && ownerId ? <p className={styles.notice} role="status">Đang kiểm tra điều kiện hợp đồng…</p> : null}
      {contracts.isError ? <BuybackErrorNotice error={contracts.error} /> : null}
      <form id="buyback-create-form" className={styles.assignmentForm} onSubmit={submitCreate}>
        {!contracts.isPending && !contracts.isError && ownerId && !hasActiveContract ? (
          <p className={styles.notice} role="note">Bạn cần có hợp đồng đang hoạt động để mở hồ sơ thu mua.</p>
        ) : null}
        <label className={styles.confirmationField}>
          <input type="checkbox" required checked={createConfirmed} onChange={(event) => setCreateConfirmed(event.target.checked)} />
          <span>Tôi xác nhận gửi yêu cầu để Dolores tiếp nhận và kiểm tra máy.</span>
        </label>
        {create.isError ? <BuybackErrorNotice error={create.error} /> : null}
        <PageActions actions={[
          { id: "buyback-create-cancel", label: "Hủy", variant: "secondary", onClick: () => { void router.push("/dashboard/buyback"); }, ...(createConfirmed ? { confirm: { title: "Hủy yêu cầu?", description: "Thông tin đã nhập sẽ bị mất.", confirmLabel: "Hủy yêu cầu" } } : {}) },
          { id: "buyback-create-submit", label: "Gửi yêu cầu thu mua", variant: "primary", type: "submit", form: "buyback-create-form", disabled: !createConfirmed || !ownerId || contracts.isPending || contracts.isError || !hasActiveContract, disabledReason: "Xác nhận yêu cầu và kiểm tra hợp đồng đang hoạt động.", pending: create.isPending, pendingLabel: "Đang mở hồ sơ…" },
        ]} />
      </form>
    </section>
  );
}

export function BuybackDetailPanel({ workflow, children }: { workflow: BuybackWorkflowController; children?: ReactNode }) {
  const { detailId, detailValid, detail, caseData, commonError } = workflow;
  const detailStatusLabel =
    caseData?.status === "VALUATION_PENDING" && workflow.role === "owner"
      ? "Đang chờ duyệt"
      : caseData?.status === "COLLECTION_PENDING" && caseData.collectionTechnicianId
        ? "Đang thu máy"
        : caseData?.status === "APPROVED" && caseData.ownerAccepted === true
          ? "Chờ thu máy"
          : caseData ? buybackStatusLabels[caseData.status] : "";

  return (
    <>
      {detailId && !detailValid ? <p className={`${styles.notice} ${styles.error}`} role="alert">Mã hồ sơ không đúng định dạng UUID.</p> : null}
      {detailValid && detail.isPending ? <p className={styles.notice} role="status">Đang tải chi tiết hồ sơ…</p> : null}
      {detailValid && detail.isError ? (
        <div className={`${styles.notice} ${styles.error}`} role="alert">
          <p>{getApiErrorMessage(detail.error)}</p>
          <ButtonBar type="button" onClick={() => void detail.refetch()}>Thử lại</ButtonBar>
        </div>
      ) : null}
      {caseData ? (
        <section className={styles.panel} aria-label="Chi tiết hồ sơ thu mua">
          <div className={styles.panelHeading}>
            <div>
              <h2 className={styles.sectionTitle}>Hồ sơ {detailStatusLabel}</h2>
              <p className={styles.formHint}>Trạng thái và giá trị lấy từ Dolores; mọi hành động tiếp theo kiểm tra lại ở server.</p>
            </div>
            <ButtonBar type="button" onClick={() => void detail.refetch()}>Làm mới</ButtonBar>
          </div>
          <BuybackCaseSummary caseData={caseData} role={workflow.role} />
          <EvidenceList resource="BUYBACK_CASE" parentId={caseData.id} title="Chứng từ thu mua" />
          {caseData.status === "REGISTERED" && !caseData.registeredMachineId ? (
            <p className={`${styles.notice} ${styles.error}`} role="alert">
              Dolores trả trạng thái đã đăng ký máy nhưng chưa có mã máy. Làm mới hồ sơ để kiểm tra lại.
            </p>
          ) : null}
          {children}
          {commonError?.error ? <BuybackErrorNotice error={commonError.error} /> : null}
        </section>
      ) : null}
    </>
  );
}

export function BuybackCaseSummary({ caseData, role }: { caseData: BuybackCase; role?: BuybackWorkflowRole }) {
  const isExternalBuyback = caseData.workflowVersion === 2;

  return (
    <dl className={styles.detailGrid}>
      <div className={styles.detailItem}><dt>Mã hồ sơ</dt><dd className={styles.codeValue}><TruncatedId value={caseData.id} /></dd></div>
      {isExternalBuyback ? <>
        <div className={styles.detailItem}><dt>Máy thu mua</dt><dd>{caseData.machineModelName ?? caseData.assetModelLabel ?? "Đang chờ Technician kiểm tra"}</dd></div>
        {caseData.machineSerialNumber ?? caseData.assetSerial ? <div className={styles.detailItem}><dt>Số serial</dt><dd className={styles.codeValue}>{caseData.machineSerialNumber ?? caseData.assetSerial}</dd></div> : null}
        {caseData.assetManufacturer ? <div className={styles.detailItem}><dt>Nhà sản xuất</dt><dd>{caseData.assetManufacturer}</dd></div> : null}
        {caseData.assetDescription ? <div className={styles.detailItem}><dt>Mô tả máy</dt><dd>{caseData.assetDescription}</dd></div> : null}
        {role === "owner" ? (
          <div className={styles.detailItem}><dt>Giá đã được duyệt</dt><dd>{formatBuybackMoney(caseData.approvedPrice, caseData.currency)}</dd></div>
        ) : <>
          <div className={styles.detailItem}><dt>Giá Technician đề xuất</dt><dd>{formatBuybackMoney(caseData.proposedPrice, caseData.currency)}</dd></div>
          <div className={styles.detailItem}><dt>Giá đã được duyệt</dt><dd>{formatBuybackMoney(caseData.approvedPrice, caseData.currency)}</dd></div>
          <div className={styles.detailItem}><dt>Giá được Owner chấp nhận</dt><dd>{formatBuybackMoney(caseData.acceptedPrice, caseData.currency)}</dd></div>
        </>}
        {caseData.registeredMachineId ? <div className={styles.detailItem}><dt>Mã máy Dolores</dt><dd className={styles.codeValue}><TruncatedId value={caseData.registeredMachineId} /></dd></div> : null}
      </> : <>
        <div className={styles.detailItem}><dt>Hợp đồng / máy</dt><dd className={styles.codeValue}><TruncatedId value={caseData.contractId} /><br /><TruncatedId value={caseData.machineId} /></dd></div>
        {role === "owner" ? (
          <div className={styles.detailItem}><dt>Giá đã duyệt</dt><dd>{formatBuybackMoney(caseData.approvedPrice, caseData.currency)}</dd></div>
        ) : <>
          <div className={styles.detailItem}><dt>Giá đề nghị</dt><dd>{formatBuybackMoney(caseData.requestedPrice, caseData.currency)}</dd></div>
          <div className={styles.detailItem}><dt>Giá đã duyệt</dt><dd>{formatBuybackMoney(caseData.approvedPrice, caseData.currency)}</dd></div>
        </>}
        <div className={styles.detailItem}><dt>Lý do</dt><dd>{caseData.reason}</dd></div>
      </>}
      {caseData.inspection ? <div className={styles.detailItem}><dt>Kết quả kiểm tra</dt><dd>{caseData.inspection.condition} · {formatBuybackMoney(caseData.inspection.valuationAmount, caseData.inspection.currency)}{caseData.inspection.notes ? ` · ${caseData.inspection.notes}` : ""}</dd></div> : null}
      {caseData.refurbishment ? <div className={styles.detailItem}><dt>Tân trang</dt><dd>{caseData.refurbishment.status} · {caseData.refurbishment.result ?? caseData.refurbishment.workPerformed ?? "Đang thực hiện"}</dd></div> : null}
      {caseData.qaDecision ? <div className={styles.detailItem}><dt>Kiểm định độc lập</dt><dd>{caseData.qaDecision.passed ? "Đạt" : "Chưa đạt"} · {caseData.qaDecision.reason}</dd></div> : null}
    </dl>
  );
}

export function BuybackErrorNotice({ error }: { error: unknown }) {
  return <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(error)}</p>;
}
