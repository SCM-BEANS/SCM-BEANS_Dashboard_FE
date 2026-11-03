import type { ReactNode } from "react";
import { ActionBarConfig } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { DataTable, type DataTableColumn } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_MODERATOR } from "@/routes/path";
import { type BuybackCase, type BuybackCaseSummary as BuybackCaseSummaryType } from "@/schema/buybacks.schema";
import { buybackStatusLabels, formatBuybackDateTime, formatBuybackMoney } from "./buyback-formatters";
import type { BuybackWorkflowController } from "./buyback-workflow-controller";
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
      {actionBarBackHref ? (
        <ActionBarConfig>
          <ButtonBar href={actionBarBackHref}>{actionBarBackLabel}</ButtonBar>
        </ActionBarConfig>
      ) : null}
      <BackButtonHeading
        title={title}
        titleId="buyback-title"
        description={description}
        back={back ?? null}
      />
      {children}
    </section>
  );
}

export function BuybackCaseList({ workflow }: { workflow: BuybackWorkflowController }) {
  const { list, showList, role, operatorRole, page, setPage } = workflow;
  if (!showList) return null;
  const listColumns: DataTableColumn<BuybackCaseSummaryType>[] = [
    {
      key: "case-id",
      header: "Mã hồ sơ",
      render: (item) => workflow.isModeratorRoute
        ? <TextLinkButton href={PATH_MODERATOR.BUYBACK_DETAIL(item.id)}>{item.id}</TextLinkButton>
        : <span className={styles.codeValue} title={item.id}>{item.id}</span>,
    },
    {
      key: "machine",
      header: "Thiết bị",
      render: (item) => item.machineSerialNumber ?? item.assetSerial ?? (item.machineId ? `Máy ${item.machineId}` : "Chờ kiểm tra"),
    },
    {
      key: "price",
      header: "Giá thu mua",
      render: (item) => {
        const price = item.acceptedPrice ?? item.approvedPrice ?? item.proposedPrice ?? item.requestedPrice;
        return price == null ? "Chưa định giá" : formatBuybackMoney(price, item.currency);
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item) => <span className={styles.buybackStatus}>{buybackStatusLabels[item.status]}</span>,
    },
    {
      key: "updated-at",
      header: "Cập nhật",
      render: (item) => formatBuybackDateTime(item.updatedAt),
    },
  ];
  if (!workflow.isModeratorRoute) {
    listColumns.push({
      key: "actions",
      header: "",
      align: "right",
      render: (item) => (
        <button
          className={styles.buybackDetailAction}
          type="button"
          aria-label={`Xem hồ sơ ${item.id}`}
          onClick={() => { workflow.setSelectedCaseId(item.id); workflow.setProofPage(0); }}
        >
          Xem hồ sơ
        </button>
      ),
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
    </>
  );
}

export function BuybackCreatePanel({ workflow }: { workflow: BuybackWorkflowController }) {
  const { createFormOpen, ownerId, contracts, hasActiveContract, createConfirmed, setCreateConfirmed, create, submitCreate } = workflow;
  if (!createFormOpen) return null;

  return (
    <section className={styles.panel} aria-labelledby="buyback-create-title">
      <h2 id="buyback-create-title" className={styles.sectionTitle}>Mở hồ sơ thu mua máy cũ</h2>
      <p className={styles.formHint}>Dolores sẽ kiểm tra máy và gửi giá để bạn quyết định. Tài khoản cần có ít nhất một hợp đồng đang hoạt động. Ở bước này, BE chỉ nhận yêu cầu mở hồ sơ; thông tin máy và giá sẽ được bổ sung sau khi Technician kiểm tra.</p>
      {!ownerId ? <p className={styles.notice} role="alert">Không xác định được Owner đăng nhập.</p> : null}
      {contracts.isPending && ownerId ? <p className={styles.notice} role="status">Đang kiểm tra điều kiện hợp đồng…</p> : null}
      {contracts.isError ? <BuybackErrorNotice error={contracts.error} /> : null}
      <form className={styles.assignmentForm} onSubmit={submitCreate}>
        {!contracts.isPending && !contracts.isError && ownerId && !hasActiveContract ? (
          <p className={styles.notice} role="note">Bạn cần có hợp đồng đang hoạt động để mở hồ sơ thu mua.</p>
        ) : null}
        <label className={styles.confirmationField}>
          <input type="checkbox" required checked={createConfirmed} onChange={(event) => setCreateConfirmed(event.target.checked)} />
          <span>Tôi xác nhận gửi yêu cầu để Dolores tiếp nhận và kiểm tra máy.</span>
        </label>
        {create.isError ? <BuybackErrorNotice error={create.error} /> : null}
        <ButtonBar type="submit" disabled={!createConfirmed || !ownerId || contracts.isPending || contracts.isError || !hasActiveContract || create.isPending}>
          {create.isPending ? "Đang mở hồ sơ…" : "Gửi yêu cầu thu mua"}
        </ButtonBar>
      </form>
    </section>
  );
}

export function BuybackDetailPanel({ workflow, children }: { workflow: BuybackWorkflowController; children?: ReactNode }) {
  const { detailId, detailValid, detail, caseData, commonError } = workflow;

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
              <h2 className={styles.sectionTitle}>Hồ sơ {buybackStatusLabels[caseData.status]}</h2>
              <p className={styles.formHint}>Trạng thái và giá trị lấy từ Dolores; mọi hành động tiếp theo kiểm tra lại ở server.</p>
            </div>
            <ButtonBar type="button" onClick={() => void detail.refetch()}>Làm mới</ButtonBar>
          </div>
          <BuybackCaseSummary caseData={caseData} />
          {children}
          {commonError?.error ? <BuybackErrorNotice error={commonError.error} /> : null}
        </section>
      ) : null}
    </>
  );
}

export function BuybackCaseSummary({ caseData }: { caseData: BuybackCase }) {
  const isExternalBuyback = caseData.workflowVersion === 2;

  return (
    <dl className={styles.detailGrid}>
      <div className={styles.detailItem}><dt>Mã hồ sơ</dt><dd className={styles.codeValue}>{caseData.id}</dd></div>
      {isExternalBuyback ? <>
        <div className={styles.detailItem}><dt>Máy thu mua</dt><dd>{caseData.machineModelName ?? caseData.assetModelLabel ?? "Đang chờ Technician kiểm tra"}</dd></div>
        {caseData.machineSerialNumber ?? caseData.assetSerial ? <div className={styles.detailItem}><dt>Số serial</dt><dd className={styles.codeValue}>{caseData.machineSerialNumber ?? caseData.assetSerial}</dd></div> : null}
        {caseData.assetManufacturer ? <div className={styles.detailItem}><dt>Nhà sản xuất</dt><dd>{caseData.assetManufacturer}</dd></div> : null}
        {caseData.assetDescription ? <div className={styles.detailItem}><dt>Mô tả máy</dt><dd>{caseData.assetDescription}</dd></div> : null}
        <div className={styles.detailItem}><dt>Giá Technician đề xuất</dt><dd>{formatBuybackMoney(caseData.proposedPrice, caseData.currency)}</dd></div>
        <div className={styles.detailItem}><dt>Giá đã được duyệt</dt><dd>{formatBuybackMoney(caseData.approvedPrice, caseData.currency)}</dd></div>
        <div className={styles.detailItem}><dt>Giá được Owner chấp nhận</dt><dd>{formatBuybackMoney(caseData.acceptedPrice, caseData.currency)}</dd></div>
        {caseData.registeredMachineId ? <div className={styles.detailItem}><dt>Mã máy Dolores</dt><dd className={styles.codeValue}>{caseData.registeredMachineId}</dd></div> : null}
      </> : <>
        <div className={styles.detailItem}><dt>Hợp đồng / máy</dt><dd className={styles.codeValue}>{caseData.contractId ?? "—"}<br />{caseData.machineId ?? "—"}</dd></div>
        <div className={styles.detailItem}><dt>Giá đề nghị</dt><dd>{formatBuybackMoney(caseData.requestedPrice, caseData.currency)}</dd></div>
        <div className={styles.detailItem}><dt>Giá đã duyệt</dt><dd>{formatBuybackMoney(caseData.approvedPrice, caseData.currency)}</dd></div>
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
