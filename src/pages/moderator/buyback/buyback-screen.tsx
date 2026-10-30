import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import Link from "next/link";

import { buybacksApi } from "@/apis/buybacks.api";
import { contractsApi } from "@/apis/contracts.api";

import { PATH_MODERATOR } from "@/routes/path";

import { BuybackIdSchema, type BuybackCase, type BuybackStatus } from "@/schema/buybacks.schema";

import { getApiErrorMessage } from "@/lib/api-errors";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

import { DataTable } from "@/components/table/data-table";

import { moderatorStyles as styles } from "../moderator-shell";
import { ModeratorPageHeading } from "../moderator-page-heading";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

function amountText(value: number | null | undefined, currency: string): string {
  return value == null
    ? "—"
    : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 20 }).format(value) + " " + currency;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function QueryFeedback({
  query,
  loadingMessage,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  loadingMessage: string;
}) {
  if (query.isPending) {
    return <p className={styles.pendingNotice} role="status">{loadingMessage}</p>;
  }
  if (query.isError) {
    return (
      <div className={styles.pendingNotice} role="alert">
        <p>{getApiErrorMessage(query.error)}</p>
        <button className={styles.retryButton} type="button" onClick={() => void query.refetch()}>
          {messages.RETRY}
        </button>
      </div>
    );
  }
  return null;
}

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd>{value == null || value === "" ? "—" : value}</dd>
    </div>
  );
}

export function ModeratorBuybackScreen({ sectionPath }: { sectionPath: string }) {
  const [page, setPage] = useState(0);
  const isNew = sectionPath === "buyback/new";
  const isList = sectionPath === "buyback" || sectionPath === "buyback/list";
  const requestedId = isList ? "" : sectionPath.slice("buyback/".length);
  const validId = BuybackIdSchema.safeParse(requestedId).success ? requestedId : "";
  const buyback = useQuery({
    queryKey: ["dolores", "moderator", "buybacks", validId],
    queryFn: ({ signal }) => buybacksApi.getById(validId, signal),
    enabled: Boolean(validId),
  });
  const buybacks = useQuery({
    queryKey: ["dolores", "moderator", "buybacks", "list", page],
    queryFn: ({ signal }) => buybacksApi.list({ page, size: 50 }, signal),
    enabled: isList,
    retry: false,
  });

  return (
    <div className={styles.pageContent}>
      <ModeratorPageHeading
        title={isNew ? messages.BUYBACK_NEW_TITLE : messages.BUYBACK_TITLE}
        description={isNew ? messages.BUYBACK_NEW_DESCRIPTION : messages.BUYBACK_DESCRIPTION}
      />
      {isNew ? <CreateBuybackScreen /> : isList ? (
        <>
          <Link className={styles.retryButton} href={PATH_MODERATOR.BUYBACK_NEW}>
            {messages.BUYBACK_CREATE}
          </Link>
          <QueryFeedback query={buybacks} loadingMessage={messages.LOADING_BUYBACK} />
          {buybacks.data?.items.length === 0 && !buybacks.isError && (
            <p className={styles.pendingNotice} role="status">{messages.BUYBACK_LIST_UNAVAILABLE}</p>
          )}
          {buybacks.data && buybacks.data.items.length > 0 && (
            <>
              <DataTable variant="moderator" headers={[
                messages.BUYBACK_ID,
                messages.BUYBACK_OWNER,
                messages.BUYBACK_MACHINE,
                messages.BUYBACK_STATUS,
                messages.BUYBACK_REQUESTED_PRICE,
                messages.BUYBACK_REQUESTED_AT,
              ]} minWidth={900}>
                {buybacks.data.items.map((item) => (
                  <tr key={item.id}>
                    <td><Link className={styles.tableLink} href={PATH_MODERATOR.BUYBACK_DETAIL(item.id)}>{item.id}</Link></td>
                    <td className={styles.codeValue}>{item.ownerId}</td>
                    <td className={styles.codeValue}>{item.machineId}</td>
                    <td>{item.status}</td>
                    <td>{amountText(item.requestedPrice, item.currency)}</td>
                    <td>{formatDate(item.requestedAt)}</td>
                  </tr>
                ))}
              </DataTable>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <button className={styles.retryButton} type="button" disabled={page <= 0} onClick={() => setPage((current) => current - 1)}>{messages.BUYBACK_PREVIOUS}</button>
                <span className={styles.formHint}>{messages.BUYBACK_LIST_PAGE(buybacks.data.page, buybacks.data.size)}</span>
                <button className={styles.retryButton} type="button" disabled={!buybacks.data.hasNext} onClick={() => setPage((current) => current + 1)}>{messages.BUYBACK_NEXT}</button>
              </div>
            </>
          )}
        </>
      ) : validId ? (
        <>
          <QueryFeedback query={buyback} loadingMessage={messages.LOADING_BUYBACK} />
          {buyback.data && !buyback.isError && <BuybackDetails buyback={buyback.data} />}
        </>
      ) : (
        <p className={styles.pendingNotice} role="status">{messages.BUYBACK_LEGACY_ID}</p>
      )}
    </div>
  );
}

function newOperationKey(): string {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formValue(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function CreateBuybackScreen() {
  const queryClient = useQueryClient();
  const [selectedContractId, setSelectedContractId] = useState("");
  const contracts = useQuery({
    queryKey: ["dolores", "moderator", "buyback", "contracts"],
    queryFn: ({ signal }) => contractsApi.list(signal),
    retry: false,
  });
  const contractDetail = useQuery({
    queryKey: ["dolores", "moderator", "buyback", "contract", selectedContractId],
    queryFn: ({ signal }) => contractsApi.getModeratorById(selectedContractId, signal),
    enabled: Boolean(selectedContractId),
    retry: false,
  });
  const create = useMutation({
    mutationFn: (form: FormData) => {
      const contractId = selectedContractId;
      const contract = contractDetail.data;
      if (!contract?.machineId) throw new Error(messages.BUYBACK_CONTRACT_MACHINE_REQUIRED);
      if (contract.status !== "ACTIVE" || contract.contractTermsSnapshot?.buybackEnabled !== true) {
        throw new Error(messages.BUYBACK_CONTRACT_NOT_ELIGIBLE);
      }
      return buybacksApi.create({
        contractId,
        machineId: contract.machineId,
        requestedPrice: Number(formValue(form, "requestedPrice")),
        currency: formValue(form, "currency").toUpperCase(),
        externalAgreementReference: formValue(form, "externalAgreementReference") || undefined,
        reason: formValue(form, "reason"),
        idempotencyKey: newOperationKey(),
        correlationId: newOperationKey(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dolores", "moderator", "buybacks"] });
    },
  });
  const candidateContracts = contracts.data?.filter((contract) =>
    contract.status === "ACTIVE" &&
    contract.machineId != null,
  ) ?? [];

  return (
    <>
      <QueryFeedback query={contracts} loadingMessage={messages.LOADING_BUYBACK_CONTRACTS} />
      {!contracts.isPending && !contracts.isError && candidateContracts.length === 0 && (
        <p className={styles.pendingNotice} role="status">{messages.BUYBACK_NO_ELIGIBLE_CONTRACT}</p>
      )}
      {candidateContracts.length > 0 && (
        <form className={styles.formPanel} onSubmit={(event) => {
          event.preventDefault();
          create.mutate(new FormData(event.currentTarget));
        }}>
          <p className={styles.formHint}>{messages.BUYBACK_CREATE_RULES}</p>
          <label className={styles.formField}>
            <span>{messages.BUYBACK_CONTRACT}</span>
            <select name="contractId" required value={selectedContractId} onChange={(event) => { setSelectedContractId(event.target.value); create.reset(); }}>
              <option value="" disabled>{messages.BUYBACK_SELECT_CONTRACT}</option>
              {candidateContracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.id} · {contract.ownerId} · {contract.machineId}
                </option>
              ))}
            </select>
          </label>
          {contractDetail.isPending && selectedContractId && <p role="status">{messages.LOADING_BUYBACK_CONTRACT_DETAIL}</p>}
          {contractDetail.isError && <p role="alert">{getApiErrorMessage(contractDetail.error)}</p>}
          {contractDetail.data && contractDetail.data.contractTermsSnapshot?.buybackEnabled !== true && (
            <p className={styles.pendingNotice} role="status">{messages.BUYBACK_CONTRACT_NOT_ELIGIBLE}</p>
          )}
          {contractDetail.data?.contractTermsSnapshot?.buybackEnabled === true && (
            <p className={styles.formHint}>{messages.BUYBACK_MINIMUM_AGE(contractDetail.data.contractTermsSnapshot.buybackMinimumMonths)}</p>
          )}
          <div className={styles.formRow}>
            <label className={styles.formField}>
              <span>{messages.BUYBACK_REQUESTED_PRICE}</span>
              <input name="requestedPrice" type="number" min="0.01" step="0.01" required />
            </label>
            <label className={styles.formField}>
              <span>{messages.BUYBACK_CURRENCY}</span>
              <input name="currency" defaultValue="VND" minLength={3} maxLength={3} required />
            </label>
          </div>
          <label className={styles.formField}>
            <span>{messages.BUYBACK_AGREEMENT}</span>
            <input name="externalAgreementReference" maxLength={128} />
          </label>
          <label className={styles.formField}>
            <span>{messages.BUYBACK_REASON}</span>
            <textarea name="reason" maxLength={1000} required />
          </label>
          <button className={styles.retryButton} type="submit" disabled={create.isPending || !contractDetail.data || contractDetail.data.status !== "ACTIVE" || contractDetail.data.contractTermsSnapshot?.buybackEnabled !== true}>
            {create.isPending ? messages.BUYBACK_CREATING : messages.BUYBACK_CREATE}
          </button>
          {create.isError && <p role="alert">{getApiErrorMessage(create.error)}</p>}
          {create.data && <p role="status">
            {messages.BUYBACK_CREATE_SUCCESS} <Link className={styles.tableLink} href={PATH_MODERATOR.BUYBACK_DETAIL(create.data.id)}>{messages.BUYBACK_OPEN_CASE}</Link>
          </p>}
        </form>
      )}
      <Link className={styles.tableLink} href={PATH_MODERATOR.BUYBACK}>{messages.BACK_TO_BUYBACKS}</Link>
    </>
  );
}

function BuybackDetails({ buyback }: { buyback: BuybackCase }) {
  const queryClient = useQueryClient();
  const [valuationApproved, setValuationApproved] = useState(true);
  const [inspectionsPage, setInspectionsPage] = useState(0);
  const [refurbishmentsPage, setRefurbishmentsPage] = useState(0);
  const [qaPage, setQaPage] = useState(0);
  const action = useMutation({
    mutationFn: (form: FormData) => {
      const keys = { idempotencyKey: newOperationKey(), correlationId: newOperationKey() };
      const reason = formValue(form, "reason");
      switch (buyback.status) {
        case "REQUESTED":
          return buybacksApi.startInspection(buyback.id, { ...keys, reason });
        case "INSPECTION_PENDING":
          return buybacksApi.submitInspection(buyback.id, {
            ...keys,
            condition: formValue(form, "condition"),
            valuationAmount: Number(formValue(form, "valuationAmount")),
            currency: formValue(form, "currency").toUpperCase(),
            notes: formValue(form, "notes") || undefined,
            evidenceReferences: formValue(form, "evidenceReferences") || undefined,
          });
        case "VALUATION_PENDING": {
          const approved = formValue(form, "approved") === "true";
          return buybacksApi.decideValuation(buyback.id, {
            ...keys,
            approved,
            approvedPrice: approved ? Number(formValue(form, "approvedPrice")) : undefined,
            reason,
          });
        }
        case "PAID":
          return buybacksApi.requestCollection(buyback.id, { ...keys, reason });
        case "COLLECTION_PENDING":
          return buybacksApi.confirmCollection(buyback.id, {
            ...keys,
            evidenceReference: formValue(form, "evidenceReference"),
          });
        case "COLLECTED":
          return buybacksApi.startRefurbishment(buyback.id, {
            ...keys,
            workPlanned: formValue(form, "workPlanned"),
            estimatedPartsCost: Number(formValue(form, "estimatedPartsCost")),
            currency: formValue(form, "currency").toUpperCase(),
          });
        case "REFURBISHING":
          return buybacksApi.completeRefurbishment(buyback.id, {
            ...keys,
            workPerformed: formValue(form, "workPerformed"),
            result: formValue(form, "result") as "PASSED" | "FAILED",
            evidenceReferences: formValue(form, "evidenceReferences") || undefined,
          });
        case "QA_PENDING":
          return buybacksApi.decideQa(buyback.id, {
            ...keys,
            passed: formValue(form, "passed") === "true",
            reason,
          });
        default:
          throw new Error(messages.BUYBACK_NO_ACTION_FOR_STATUS);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "moderator", "buybacks"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "moderator", "buyback-history", buyback.id] }),
      ]);
    },
  });
  const payment = useMutation({
    mutationFn: (form: FormData) => buybacksApi.createPayment(buyback.id, {
      paymentMethod: formValue(form, "paymentMethod"),
      externalReference: formValue(form, "externalReference") || undefined,
      idempotencyKey: newOperationKey(),
      correlationId: newOperationKey(),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dolores", "moderator", "buybacks"] });
    },
  });
  const cancel = useMutation({
    mutationFn: (form: FormData) => buybacksApi.cancel(buyback.id, {
      idempotencyKey: newOperationKey(),
      correlationId: newOperationKey(),
      reason: formValue(form, "reason"),
    }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "moderator", "buybacks"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "moderator", "buybacks", buyback.id] }),
      ]);
    },
  });
  const inspections = useQuery({
    queryKey: ["dolores", "moderator", "buyback-history", buyback.id, "inspections", inspectionsPage],
    queryFn: ({ signal }) => buybacksApi.getInspections(buyback.id, inspectionsPage, 50, signal),
  });
  const refurbishments = useQuery({
    queryKey: ["dolores", "moderator", "buyback-history", buyback.id, "refurbishments", refurbishmentsPage],
    queryFn: ({ signal }) => buybacksApi.getRefurbishments(buyback.id, refurbishmentsPage, 50, signal),
  });
  const qaDecisions = useQuery({
    queryKey: ["dolores", "moderator", "buyback-history", buyback.id, "qa", qaPage],
    queryFn: ({ signal }) => buybacksApi.getQaDecisions(buyback.id, qaPage, 50, signal),
  });
  const hasAction = ["REQUESTED", "INSPECTION_PENDING", "VALUATION_PENDING", "PAID", "COLLECTION_PENDING", "COLLECTED", "REFURBISHING", "QA_PENDING"].includes(buyback.status);
  const canCancel = ["REQUESTED", "INSPECTION_PENDING", "VALUATION_PENDING", "APPROVED", "PAYMENT_PENDING"].includes(buyback.status);

  return (
    <>
      <dl className={styles.detailGrid}>
        <DetailField label={messages.BUYBACK_ID} value={buyback.id} />
        <DetailField label={messages.BUYBACK_OWNER} value={buyback.ownerId} />
        <DetailField label={messages.BUYBACK_CONTRACT} value={buyback.contractId} />
        <DetailField label={messages.BUYBACK_MACHINE} value={buyback.machineId} />
        <DetailField label={messages.BUYBACK_STATUS} value={buyback.status} />
        <DetailField label={messages.BUYBACK_REQUESTED_PRICE} value={amountText(buyback.requestedPrice, buyback.currency)} />
        <DetailField label={messages.BUYBACK_APPROVED_PRICE} value={amountText(buyback.approvedPrice, buyback.currency)} />
        <DetailField label={messages.BUYBACK_CURRENCY} value={buyback.currency} />
        <DetailField label={messages.BUYBACK_REASON} value={buyback.reason} />
        <DetailField label={messages.BUYBACK_REQUESTED_AT} value={buyback.requestedAt} />
        <DetailField label={messages.BUYBACK_AGREEMENT} value={buyback.externalAgreementReference} />
        {buyback.collectionEvidenceRecorded && (
          <DetailField label={messages.BUYBACK_COLLECTION_EVIDENCE} value={messages.BUYBACK_EVIDENCE_AVAILABLE} />
        )}
        {buyback.qaDecision && <DetailField label={messages.BUYBACK_QA_RESULT} value={buyback.qaDecision.passed == null ? "—" : buyback.qaDecision.passed ? "Đạt" : "Không đạt"} />}
      </dl>
      {buyback.status === "PAYMENT_PENDING" ? (
        <p className={styles.pendingNotice} role="note">{messages.BUYBACK_WAITING_OWNER_PAYMENT}</p>
      ) : null}
      {buyback.status === "APPROVED" && <form className={styles.formPanel} onSubmit={(event) => {
        event.preventDefault();
        payment.mutate(new FormData(event.currentTarget));
      }}>
        <h2 className={styles.sectionTitle}>{messages.BUYBACK_PAYMENT_TITLE}</h2>
        <p className={styles.formHint}>{messages.BUYBACK_PAYMENT_DESCRIPTION(amountText(buyback.approvedPrice, buyback.currency))}</p>
        <Field label={messages.BUYBACK_PAYMENT_METHOD} name="paymentMethod" maxLength={64} required />
        <Field label={messages.BUYBACK_EXTERNAL_PAYMENT_REFERENCE} name="externalReference" maxLength={128} />
        <button className={styles.retryButton} type="submit" disabled={payment.isPending}>
          {payment.isPending ? messages.BUYBACK_SAVING : messages.BUYBACK_CREATE_PAYMENT}
        </button>
        {payment.isError && <p role="alert">{getApiErrorMessage(payment.error)}</p>}
      </form>}
      {payment.data && <p className={styles.pendingNotice} role="status">
        {messages.BUYBACK_PAYMENT_CREATED} <code>{payment.data.id}</code>. {messages.BUYBACK_PAYMENT_CREATED_AMOUNT(amountText(payment.data.amount, payment.data.currency))}
      </p>}
      {hasAction && <form className={styles.formPanel} onSubmit={(event) => {
        event.preventDefault();
        action.mutate(new FormData(event.currentTarget));
      }}>
        <h2 className={styles.sectionTitle}>{messages.BUYBACK_WORKFLOW_TITLE}</h2>
        {buyback.status === "REQUESTED" && <>
          <p className={styles.formHint}>{messages.BUYBACK_ACTION_START_INSPECTION}</p>
          <Field label={messages.BUYBACK_ACTION_REASON} name="reason" required />
        </>}
        {buyback.status === "INSPECTION_PENDING" && <>
          <p className={styles.formHint}>{messages.BUYBACK_ACTION_SUBMIT_INSPECTION}</p>
          <Field label={messages.BUYBACK_MACHINE_CONDITION} name="condition" required />
          <div className={styles.formRow}>
            <Field label={messages.BUYBACK_VALUATION_AMOUNT} name="valuationAmount" type="number" min="0.01" step="0.01" required />
            <Field label={messages.BUYBACK_CURRENCY} name="currency" defaultValue="VND" minLength={3} maxLength={3} required />
          </div>
          <Field label={messages.BUYBACK_INSPECTION_NOTES} name="notes" multiline />
          <Field label={messages.BUYBACK_EVIDENCE_REFERENCES} name="evidenceReferences" />
        </>}
        {buyback.status === "VALUATION_PENDING" && <>
          <p className={styles.formHint}>{messages.BUYBACK_ACTION_VALUATION}</p>
          <label className={styles.formField}><span>{messages.BUYBACK_DECISION}</span><select name="approved" value={valuationApproved ? "true" : "false"} onChange={(event) => setValuationApproved(event.target.value === "true")}><option value="true">Duyệt</option><option value="false">Từ chối</option></select></label>
          <Field label={messages.BUYBACK_APPROVED_PRICE} name="approvedPrice" type="number" min="0.01" step="0.01" required={valuationApproved} />
          <Field label={messages.BUYBACK_ACTION_REASON} name="reason" required />
        </>}
        {buyback.status === "PAID" && <>
          <p className={styles.formHint}>{messages.BUYBACK_ACTION_REQUEST_COLLECTION}</p>
          <Field label={messages.BUYBACK_ACTION_REASON} name="reason" required />
        </>}
        {buyback.status === "COLLECTION_PENDING" && <>
          <p className={styles.formHint}>{messages.BUYBACK_ACTION_CONFIRM_COLLECTION}</p>
          <Field label={messages.BUYBACK_COLLECTION_EVIDENCE} name="evidenceReference" required />
        </>}
        {buyback.status === "COLLECTED" && <>
          <p className={styles.formHint}>{messages.BUYBACK_ACTION_START_REFURBISHMENT}</p>
          <Field label={messages.BUYBACK_WORK_PLANNED} name="workPlanned" required multiline />
          <div className={styles.formRow}>
            <Field label={messages.BUYBACK_PARTS_COST} name="estimatedPartsCost" type="number" min="0" step="0.01" required />
            <Field label={messages.BUYBACK_CURRENCY} name="currency" defaultValue="VND" minLength={3} maxLength={3} required />
          </div>
        </>}
        {buyback.status === "REFURBISHING" && <>
          <p className={styles.formHint}>{messages.BUYBACK_ACTION_COMPLETE_REFURBISHMENT}</p>
          <Field label={messages.BUYBACK_WORK_PERFORMED} name="workPerformed" required multiline />
          <label className={styles.formField}><span>{messages.BUYBACK_REFURBISHMENT_RESULT}</span><select name="result" defaultValue="PASSED"><option value="PASSED">Đạt</option><option value="FAILED">Không đạt</option></select></label>
          <Field label={messages.BUYBACK_EVIDENCE_REFERENCES} name="evidenceReferences" />
        </>}
        {buyback.status === "QA_PENDING" && <>
          <p className={styles.formHint}>{messages.BUYBACK_ACTION_QA}</p>
          <label className={styles.formField}><span>{messages.BUYBACK_QA_RESULT}</span><select name="passed" defaultValue="true"><option value="true">Đạt</option><option value="false">Không đạt</option></select></label>
          <Field label={messages.BUYBACK_ACTION_REASON} name="reason" required />
        </>}
        <button className={styles.retryButton} type="submit" disabled={action.isPending}>
          {action.isPending ? messages.BUYBACK_SAVING : getBuybackActionLabel(buyback.status)}
        </button>
        {action.isError && <p role="alert">{getApiErrorMessage(action.error)}</p>}
        {action.isSuccess && <p role="status">{messages.BUYBACK_ACTION_SUCCESS}</p>}
      </form>}
      {canCancel && <form className={styles.formPanel} onSubmit={(event) => {
        event.preventDefault();
        if (window.confirm(messages.BUYBACK_CANCEL_CONFIRM)) cancel.mutate(new FormData(event.currentTarget));
      }}>
        <h2 className={styles.sectionTitle}>{messages.BUYBACK_CANCEL_TITLE}</h2>
        <Field label={messages.BUYBACK_ACTION_REASON} name="reason" required />
        <button className={styles.retryButton} type="submit" disabled={cancel.isPending}>{cancel.isPending ? messages.BUYBACK_SAVING : messages.BUYBACK_CANCEL}</button>
        {cancel.isError && <p role="alert">{getApiErrorMessage(cancel.error)}</p>}
      </form>}
      <section className={styles.pendingNotice}>
        <h2 className={styles.sectionTitle}>{messages.BUYBACK_HISTORY_TITLE}</h2>
        <HistoryFeedback pending={inspections.isPending} error={inspections.isError} />
        {inspections.data && <ul>{inspections.data.items.map((record) => <li key={record.id ?? record.inspectedAt}>
          {formatDate(record.inspectedAt)} · {record.condition ?? "—"} · {amountText(record.valuationAmount, record.currency ?? buyback.currency)}
        </li>)}</ul>}
        {inspections.data && <HistoryPager data={inspections.data} onPageChange={setInspectionsPage} />}
        <HistoryFeedback pending={refurbishments.isPending} error={refurbishments.isError} />
        {refurbishments.data && <ul>{refurbishments.data.items.map((record) => <li key={record.id ?? record.startedAt}>
          {formatDate(record.startedAt)} · {record.workPerformed ?? record.status ?? "—"} · {record.result ?? "—"}
        </li>)}</ul>}
        {refurbishments.data && <HistoryPager data={refurbishments.data} onPageChange={setRefurbishmentsPage} />}
        <HistoryFeedback pending={qaDecisions.isPending} error={qaDecisions.isError} />
        {qaDecisions.data && <ul>{qaDecisions.data.items.map((record) => <li key={record.eventId ?? record.occurredAt}>
          {formatDate(record.occurredAt)} · {record.passed ? "Đạt" : "Không đạt"} · {record.reason ?? "—"}
        </li>)}</ul>}
        {qaDecisions.data && <HistoryPager data={qaDecisions.data} onPageChange={setQaPage} />}
      </section>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  multiline = false,
  defaultValue,
  min,
  step,
  minLength,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  multiline?: boolean;
  defaultValue?: string;
  min?: string;
  step?: string;
  minLength?: number;
  maxLength?: number;
}) {
  return <label className={styles.formField}>
    <span>{label}</span>
    {multiline
      ? <textarea name={name} required={required} maxLength={maxLength} defaultValue={defaultValue} />
      : <input name={name} type={type} required={required} min={min} step={step} minLength={minLength} maxLength={maxLength} defaultValue={defaultValue} />}
  </label>;
}

function HistoryFeedback({ pending, error }: { pending: boolean; error: boolean }) {
  if (pending) return <p role="status">{messages.BUYBACK_HISTORY_LOADING}</p>;
  if (error) return <p role="status">{messages.BUYBACK_HISTORY_UNAVAILABLE}</p>;
  return null;
}

function HistoryPager({
  data,
  onPageChange,
}: {
  data: { page: number; size: number; hasNext: boolean };
  onPageChange: (page: number) => void;
}) {
  return <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
    <button className={styles.retryButton} type="button" disabled={data.page <= 0} onClick={() => onPageChange(data.page - 1)}>{messages.BUYBACK_PREVIOUS}</button>
    <span className={styles.formHint}>{messages.BUYBACK_HISTORY_PAGE(data.page, data.size)}</span>
    <button className={styles.retryButton} type="button" disabled={!data.hasNext} onClick={() => onPageChange(data.page + 1)}>{messages.BUYBACK_NEXT}</button>
  </div>;
}

function getBuybackActionLabel(status: BuybackStatus): string {
  const labels: Partial<Record<BuybackStatus, string>> = {
    REQUESTED: messages.BUYBACK_START_INSPECTION,
    INSPECTION_PENDING: messages.BUYBACK_SUBMIT_INSPECTION,
    VALUATION_PENDING: messages.BUYBACK_DECIDE_VALUATION,
    PAID: messages.BUYBACK_REQUEST_COLLECTION,
    COLLECTION_PENDING: messages.BUYBACK_CONFIRM_COLLECTION,
    COLLECTED: messages.BUYBACK_START_REFURBISHMENT,
    REFURBISHING: messages.BUYBACK_COMPLETE_REFURBISHMENT,
    QA_PENDING: messages.BUYBACK_DECIDE_QA,
  };
  return labels[status] ?? messages.BUYBACK_SAVE;
}
