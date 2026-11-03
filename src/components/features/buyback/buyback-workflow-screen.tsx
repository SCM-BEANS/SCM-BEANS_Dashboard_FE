import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { buybacksApi } from "@/apis/buybacks.api";
import { contractsApi } from "@/apis/contracts.api";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { getApiErrorMessage } from "@/lib/api-errors";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import { BuybackIdSchema } from "@/schema/buybacks.schema";
import styles from "../repair-workflow/repair-workflow.module.css";

type Role = "owner" | "operator" | "technician";
type Props = { role: Role; initialCaseId?: string; listHref?: string; operatorRole?: "ADMIN" | "MODERATOR" };

function money(value: number | null | undefined, currency: string) {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value)} ${currency}`;
}

function ErrorNotice({ error }: { error: unknown }) {
  return <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(error)}</p>;
}

export function BuybackWorkflowScreen({ role, initialCaseId, listHref, operatorRole }: Props) {
  const queryClient = useQueryClient();
  const idempotencyKeys = useRef(new Map<string, string>());
  const subject = authScopedQuerySubject(role === "operator" ? operatorRole ?? role : role.toUpperCase());
  const ownerId = getAuthenticatedSubjectId();
  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId ?? "");
  const [page, setPage] = useState(0);
  const [contractId, setContractId] = useState("");
  const [requestedPrice, setRequestedPrice] = useState("");
  const [currency, setCurrency] = useState("");
  const [reason, setReason] = useState("");
  const [condition, setCondition] = useState("");
  const [valuationAmount, setValuationAmount] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [approvedPrice, setApprovedPrice] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofId, setProofId] = useState("");
  const [proofReviewReason, setProofReviewReason] = useState("");
  const [collectionReason, setCollectionReason] = useState("");
  const [workPlanned, setWorkPlanned] = useState("");
  const [estimatedPartsCost, setEstimatedPartsCost] = useState("");
  const [workPerformed, setWorkPerformed] = useState("");
  const [workResult, setWorkResult] = useState("");
  const [qaReason, setQaReason] = useState("");
  const [qaPassed, setQaPassed] = useState(true);

  const list = useQuery({
    queryKey: ["dolores", role, "buybacks", subject, page],
    queryFn: ({ signal }) => buybacksApi.list({ page, size: 20 }, signal),
    retry: false,
  });
  const detailId = selectedCaseId || initialCaseId || "";
  const detailValid = BuybackIdSchema.safeParse(detailId).success;
  const detail = useQuery({
    queryKey: ["dolores", role, "buyback", subject, detailId],
    queryFn: ({ signal }) => buybacksApi.getById(detailId, signal),
    enabled: detailValid,
    retry: false,
  });
  const contracts = useQuery({
    queryKey: ["dolores", "owner", "buyback-contracts", subject],
    queryFn: ({ signal }) => contractsApi.listByOwner(ownerId!, signal),
    enabled: role === "owner" && Boolean(ownerId),
    retry: false,
  });
  const activeContracts = contracts.data?.filter((item) => item.status === "ACTIVE" && item.machineId) ?? [];
  const operationKey = (action: string, resourceId = "new") => {
    const scope = `${action}:${resourceId}`;
    let key = idempotencyKeys.current.get(scope);
    if (!key) {
      key = createIdempotencyKey();
      idempotencyKeys.current.set(scope, key);
    }
    return key;
  };
  const clearOperationKey = (action: string, resourceId = "new") => {
    idempotencyKeys.current.delete(`${action}:${resourceId}`);
  };
  const invalidate = async (caseId = detailId) => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["dolores", role, "buybacks", subject] }),
    ...(caseId ? [queryClient.invalidateQueries({ queryKey: ["dolores", role, "buyback", subject, caseId] })] : []),
  ]);

  const create = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.create>[0]) => buybacksApi.create(input),
    onSuccess: async (value) => { clearOperationKey("create"); setSelectedCaseId(value.id); await invalidate(value.id); },
  });
  const startInspection = useMutation({ mutationFn: (input: { id: string; reason: string; idempotencyKey: string; correlationId: string }) => buybacksApi.startInspection(input.id, input), onSuccess: (_, input) => clearOperationKey("inspection-start", input.id), onSettled: () => invalidate() });
  const submitInspection = useMutation({ mutationFn: (input: Parameters<typeof buybacksApi.submitInspection>[1] & { id: string }) => buybacksApi.submitInspection(input.id, input), onSuccess: (_, input) => clearOperationKey("inspection-submit", input.id), onSettled: () => invalidate() });
  const decideValuation = useMutation({ mutationFn: (input: Parameters<typeof buybacksApi.decideValuation>[1] & { id: string }) => buybacksApi.decideValuation(input.id, input), onSuccess: (_, input) => clearOperationKey("valuation-decision", input.id), onSettled: () => invalidate() });
  const createPayment = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.createPayment>[1] & { id: string }) => buybacksApi.createPayment(input.id, input),
    onSuccess: (payment, input) => { clearOperationKey("create-payment", input.id); setPaymentId(payment.id); },
    onSettled: () => invalidate(),
  });
  const submitProof = useMutation({
    mutationFn: (input: { id: string; paymentId: string; key: string; correlationId: string; file: File }) => buybacksApi.submitPaymentProof(input.id, input.paymentId, input.key, input.correlationId, input.file),
    onSuccess: (proof, input) => { clearOperationKey("payment-proof", `${input.id}:${input.paymentId}`); setProofId(proof.id); setProofFile(null); },
    onSettled: () => invalidate(),
  });
  const reviewProof = useMutation({ mutationFn: (input: Parameters<typeof buybacksApi.reviewPaymentProof>[1] & { proofId: string; approved: boolean }) => buybacksApi.reviewPaymentProof(input.proofId, input), onSuccess: (_, input) => clearOperationKey(`proof-review-${input.approved ? "approve" : "reject"}`, input.proofId), onSettled: () => invalidate() });
  const requestCollection = useMutation({ mutationFn: (input: Parameters<typeof buybacksApi.requestCollection>[1] & { id: string }) => buybacksApi.requestCollection(input.id, input), onSuccess: (_, input) => clearOperationKey("collection-request", input.id), onSettled: () => invalidate() });
  const startRefurbishment = useMutation({ mutationFn: (input: Parameters<typeof buybacksApi.startRefurbishment>[1] & { id: string }) => buybacksApi.startRefurbishment(input.id, input), onSuccess: (_, input) => clearOperationKey("refurbishment-start", input.id), onSettled: () => invalidate() });
  const completeRefurbishment = useMutation({ mutationFn: (input: Parameters<typeof buybacksApi.completeRefurbishment>[1] & { id: string }) => buybacksApi.completeRefurbishment(input.id, input), onSuccess: (_, input) => clearOperationKey("refurbishment-complete", input.id), onSettled: () => invalidate() });
  const decideQa = useMutation({ mutationFn: (input: Parameters<typeof buybacksApi.decideQa>[1] & { id: string }) => buybacksApi.decideQa(input.id, input), onSuccess: (_, input) => clearOperationKey("qa-decision", input.id), onSettled: () => invalidate() });
  const downloadProof = useMutation({ mutationFn: (id: string) => buybacksApi.downloadPaymentProofContent(id), onSuccess: ({ blob }) => { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "buyback-payment-proof"; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); } });

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const contract = activeContracts.find((item) => item.id === contractId);
    if (!contract?.machineId || !requestedPrice || !currency.trim() || !reason.trim()) return;
    const key = operationKey("create");
    create.mutate({ contractId, machineId: contract.machineId, requestedPrice: Number(requestedPrice), currency: currency.trim(), reason: reason.trim(), idempotencyKey: key, correlationId: key });
  };
  const perform = (run: () => void) => (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); run(); };
  const commonError = [startInspection, submitInspection, decideValuation, createPayment, submitProof, reviewProof, requestCollection, startRefurbishment, completeRefurbishment, decideQa].find((mutation) => mutation.isError);
  const caseData = detail.data;
  const canTechnicianAct = role === "technician" || role === "operator";
  const backHref = listHref ?? "/dashboard/buyback";

  return (
    <main className={`${styles.screen} ${styles.pageContent}`}>
      <BackButtonHeading title="Thu mua và tân trang máy" titleId="buyback-title" description="Theo dõi đề nghị, thẩm định, thanh toán, thu hồi và kiểm định theo trạng thái do Dolores xác nhận." back={detailId && !initialCaseId ? { label: "Danh sách hồ sơ", fallbackHref: backHref } : null} />
      {list.isPending ? <p className={styles.notice} role="status">Đang tải hồ sơ thu mua…</p> : null}
      {list.isError ? <div className={`${styles.notice} ${styles.error}`} role="alert"><p>{getApiErrorMessage(list.error)}</p><ButtonBar type="button" onClick={() => void list.refetch()}>Thử lại</ButtonBar></div> : null}
      {!list.isPending && !list.isError && list.data?.items.length === 0 ? <p className={styles.notice} role="status">Chưa có hồ sơ trong phạm vi tài khoản.</p> : null}
      {list.data?.items.length ? <section className={styles.panel} aria-label="Danh sách hồ sơ thu mua">
        <h2 className={styles.sectionTitle}>Hồ sơ</h2>
        <div className={styles.detailGrid}>{list.data.items.map((item) => <button className={styles.detailItem} key={item.id} type="button" onClick={() => setSelectedCaseId(item.id)}><strong>{item.status}</strong><span className={styles.codeValue}>{item.id}</span><span>{money(item.requestedPrice, item.currency)}</span><span>Contract {item.contractId}</span></button>)}</div>
        <div className={styles.technicalRequestActions}><ButtonBar type="button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Trang trước</ButtonBar><span>Trang {list.data.page + 1}</span><ButtonBar type="button" disabled={!list.data.hasNext} onClick={() => setPage((value) => value + 1)}>Trang sau</ButtonBar></div>
      </section> : null}

      {role === "owner" && !detailId ? <section className={styles.panel} aria-labelledby="buyback-create-title">
        <h2 id="buyback-create-title" className={styles.sectionTitle}>Gửi đề nghị mua lại</h2>
        {!ownerId ? <p className={styles.notice} role="alert">Không xác định được Owner đăng nhập để tải hợp đồng.</p> : null}
        {contracts.isError ? <ErrorNotice error={contracts.error} /> : null}
        <form className={styles.assignmentForm} onSubmit={submitCreate}>
          <label className={styles.formField}><span>Hợp đồng đang hoạt động</span><select required value={contractId} onChange={(event) => setContractId(event.target.value)}><option value="">Chọn hợp đồng</option>{activeContracts.map((item) => <option key={item.id} value={item.id}>{item.id} · máy {item.machineId}</option>)}</select></label>
          <label className={styles.formField}><span>Giá đề nghị</span><input required min="0.01" step="0.01" type="number" value={requestedPrice} onChange={(event) => setRequestedPrice(event.target.value)} /></label>
          <label className={styles.formField}><span>Tiền tệ</span><input required maxLength={16} value={currency} onChange={(event) => setCurrency(event.target.value)} /></label>
          <label className={styles.formField}><span>Lý do</span><textarea required maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          {create.isError ? <ErrorNotice error={create.error} /> : null}
          <ButtonBar type="submit" disabled={!contractId || !requestedPrice || !currency.trim() || !reason.trim() || create.isPending}>{create.isPending ? "Đang gửi…" : "Gửi đề nghị"}</ButtonBar>
        </form>
      </section> : null}

      {detailId && !detailValid ? <p className={`${styles.notice} ${styles.error}`} role="alert">Mã hồ sơ không đúng định dạng UUID.</p> : null}
      {detailValid && detail.isPending ? <p className={styles.notice} role="status">Đang tải chi tiết hồ sơ…</p> : null}
      {detailValid && detail.isError ? <div className={`${styles.notice} ${styles.error}`} role="alert"><p>{getApiErrorMessage(detail.error)}</p><ButtonBar type="button" onClick={() => void detail.refetch()}>Thử lại</ButtonBar></div> : null}
      {caseData ? <section className={styles.panel} aria-label="Chi tiết hồ sơ thu mua">
        <div className={styles.panelHeading}><div><h2 className={styles.sectionTitle}>Hồ sơ {caseData.status}</h2><p className={styles.formHint}>Trạng thái và giá trị lấy từ Dolores; mọi hành động tiếp theo kiểm tra lại ở server.</p></div><ButtonBar type="button" onClick={() => void detail.refetch()}>Làm mới</ButtonBar></div>
        <dl className={styles.detailGrid}>
          <div className={styles.detailItem}><dt>Mã hồ sơ</dt><dd className={styles.codeValue}>{caseData.id}</dd></div>
          <div className={styles.detailItem}><dt>Contract / máy</dt><dd className={styles.codeValue}>{caseData.contractId}<br />{caseData.machineId}</dd></div>
          <div className={styles.detailItem}><dt>Giá đề nghị</dt><dd>{money(caseData.requestedPrice, caseData.currency)}</dd></div>
          <div className={styles.detailItem}><dt>Giá đã duyệt</dt><dd>{money(caseData.approvedPrice, caseData.currency)}</dd></div>
          <div className={styles.detailItem}><dt>Lý do</dt><dd>{caseData.reason}</dd></div>
          {caseData.inspection ? <div className={styles.detailItem}><dt>Kết quả kiểm tra</dt><dd>{caseData.inspection.condition} · {money(caseData.inspection.valuationAmount, caseData.inspection.currency)}{caseData.inspection.notes ? ` · ${caseData.inspection.notes}` : ""}</dd></div> : null}
          {caseData.refurbishment ? <div className={styles.detailItem}><dt>Tân trang</dt><dd>{caseData.refurbishment.status} · {caseData.refurbishment.result ?? caseData.refurbishment.workPerformed ?? "Đang thực hiện"}</dd></div> : null}
          {caseData.qaDecision ? <div className={styles.detailItem}><dt>Kiểm định độc lập</dt><dd>{caseData.qaDecision.passed ? "Đạt" : "Chưa đạt"} · {caseData.qaDecision.reason}</dd></div> : null}
        </dl>

        {role === "technician" && caseData.status === "REQUESTED" ? <form className={styles.formPanel} onSubmit={perform(() => { const key = operationKey("inspection-start", caseData.id); startInspection.mutate({ id: caseData.id, reason: "Bắt đầu kiểm tra máy theo hồ sơ thu mua.", idempotencyKey: key, correlationId: key }); })}><h3 className={styles.sectionTitle}>Bắt đầu kiểm tra máy</h3><ButtonBar type="submit" disabled={startInspection.isPending}>Bắt đầu kiểm tra</ButtonBar></form> : null}
        {canTechnicianAct && caseData.status === "INSPECTION_PENDING" ? <form className={styles.formPanel} onSubmit={perform(() => { const key = operationKey("inspection-submit", caseData.id); submitInspection.mutate({ id: caseData.id, condition: condition.trim(), valuationAmount: Number(valuationAmount), currency: currency.trim() || caseData.currency, ...(inspectionNotes.trim() ? { notes: inspectionNotes.trim() } : {}), idempotencyKey: key, correlationId: key }); })}>
          <h3 className={styles.sectionTitle}>Ghi nhận kiểm tra và định giá sơ bộ</h3>
          <label className={styles.formField}><span>Tình trạng máy</span><textarea required maxLength={2000} value={condition} onChange={(event) => setCondition(event.target.value)} /></label>
          <label className={styles.formField}><span>Giá trị thẩm định</span><input required type="number" min="0.01" step="0.01" value={valuationAmount} onChange={(event) => setValuationAmount(event.target.value)} /></label>
          <label className={styles.formField}><span>Ghi chú</span><textarea maxLength={2000} value={inspectionNotes} onChange={(event) => setInspectionNotes(event.target.value)} /></label>
          <p className={styles.formHint}>Endpoint hiện không có API upload/đọc evidence kiểm tra. Form không nhận URL hoặc storage key.</p>
          <ButtonBar type="submit" disabled={!condition.trim() || !valuationAmount || submitInspection.isPending}>Gửi kết quả kiểm tra</ButtonBar>
        </form> : null}
        {role === "operator" && caseData.status === "VALUATION_PENDING" ? <form className={styles.formPanel} onSubmit={perform(() => { const key = operationKey("valuation-decision", caseData.id); decideValuation.mutate({ id: caseData.id, approved: Boolean(approvedPrice), ...(approvedPrice ? { approvedPrice: Number(approvedPrice) } : {}), reason: decisionReason.trim(), idempotencyKey: key, correlationId: key }); })}>
          <h3 className={styles.sectionTitle}>Quyết định giá</h3>
          <label className={styles.formField}><span>Giá duyệt (để trống nếu từ chối)</span><input type="number" min="0.01" step="0.01" value={approvedPrice} onChange={(event) => setApprovedPrice(event.target.value)} /></label>
          <label className={styles.formField}><span>Lý do quyết định</span><textarea required maxLength={2000} value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} /></label>
          <ButtonBar type="submit" disabled={!decisionReason.trim() || decideValuation.isPending}>{approvedPrice ? "Duyệt giá" : "Từ chối giá"}</ButtonBar>
        </form> : null}
        {role === "owner" && caseData.status === "APPROVED" ? <form className={styles.formPanel} onSubmit={perform(() => { const key = operationKey("create-payment", caseData.id); createPayment.mutate({ id: caseData.id, paymentMethod: paymentMethod.trim(), ...(externalReference.trim() ? { externalReference: externalReference.trim() } : {}), idempotencyKey: key, correlationId: key }); })}>
          <h3 className={styles.sectionTitle}>Tạo nghĩa vụ thanh toán</h3><label className={styles.formField}><span>Phương thức thanh toán</span><input required maxLength={64} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} /></label><label className={styles.formField}><span>Mã tham chiếu bên ngoài (tùy chọn)</span><input maxLength={256} value={externalReference} onChange={(event) => setExternalReference(event.target.value)} /></label><ButtonBar type="submit" disabled={!paymentMethod.trim() || createPayment.isPending}>Tạo thông tin thanh toán</ButtonBar>
        </form> : null}
        {role === "owner" && caseData.status === "PAYMENT_PENDING" ? <div className={styles.formPanel}>
          <h3 className={styles.sectionTitle}>Chứng từ thanh toán riêng tư</h3>{paymentId ? <p className={styles.notice} role="status">Mã khoản thanh toán: <span className={styles.codeValue}>{paymentId}</span></p> : <p className={styles.formHint}>Nếu vừa tạo khoản thanh toán trong phiên này, mã sẽ hiện ở đây. Backend hiện chưa cung cấp API liệt kê khoản thanh toán theo hồ sơ.</p>}
          {paymentId ? <form className={styles.assignmentForm} onSubmit={perform(() => { if (proofFile) { const key = operationKey("payment-proof", `${caseData.id}:${paymentId}`); submitProof.mutate({ id: caseData.id, paymentId, key, correlationId: key, file: proofFile }); } })}><label className={styles.formField}><span>Tệp PDF, JPEG hoặc PNG (tối đa 20 MB)</span><input required type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setProofFile(event.target.files?.[0] ?? null)} /></label><ButtonBar type="submit" disabled={!proofFile || submitProof.isPending}>Tải chứng từ riêng tư</ButtonBar></form> : null}
          {proofId ? <p className={styles.notice} role="status">Đã tải chứng từ. Chia sẻ mã hồ sơ/chứng từ với operator để họ duyệt: <span className={styles.codeValue}>{proofId}</span></p> : null}
        </div> : null}
        {role === "operator" && caseData.status === "PAYMENT_PENDING" ? <div className={styles.formPanel}><h3 className={styles.sectionTitle}>Kiểm tra chứng từ thanh toán</h3><p className={styles.formHint}>Nhập mã chứng từ do Owner chuyển giao; API hiện chưa có danh sách chứng từ/khoản thanh toán theo hồ sơ.</p><label className={styles.formField}><span>Mã chứng từ</span><input value={proofId} onChange={(event) => setProofId(event.target.value)} /></label><ButtonBar type="button" disabled={!proofId || downloadProof.isPending} onClick={() => downloadProof.mutate(proofId)}>Tải chứng từ qua endpoint riêng tư</ButtonBar><label className={styles.formField}><span>Lý do duyệt / từ chối</span><textarea required maxLength={2000} value={proofReviewReason} onChange={(event) => setProofReviewReason(event.target.value)} /></label><div className={styles.technicalRequestActions}><ButtonBar type="button" disabled={!proofId || !proofReviewReason.trim() || reviewProof.isPending} onClick={() => { const key = operationKey("proof-review-approve", proofId); reviewProof.mutate({ proofId, approved: true, reason: proofReviewReason.trim(), idempotencyKey: key, correlationId: key }); }}>Duyệt thanh toán</ButtonBar><ButtonBar type="button" disabled={!proofId || !proofReviewReason.trim() || reviewProof.isPending} onClick={() => { const key = operationKey("proof-review-reject", proofId); reviewProof.mutate({ proofId, approved: false, reason: proofReviewReason.trim(), idempotencyKey: key, correlationId: key }); }}>Từ chối</ButtonBar></div></div> : null}
        {role === "operator" && caseData.status === "PAID" ? <form className={styles.formPanel} onSubmit={perform(() => { const key = operationKey("collection-request", caseData.id); requestCollection.mutate({ id: caseData.id, reason: collectionReason.trim(), idempotencyKey: key, correlationId: key }); })}><h3 className={styles.sectionTitle}>Yêu cầu thu hồi máy</h3><label className={styles.formField}><span>Lý do / hướng dẫn thu hồi</span><textarea required maxLength={2000} value={collectionReason} onChange={(event) => setCollectionReason(event.target.value)} /></label><ButtonBar type="submit" disabled={!collectionReason.trim() || requestCollection.isPending}>Yêu cầu thu hồi</ButtonBar></form> : null}
        {caseData.status === "COLLECTION_PENDING" ? <p className={styles.notice} role="note">Xác nhận thu hồi đang khóa: API yêu cầu evidenceReference nhưng chưa có endpoint upload/đọc chứng từ thu hồi. Không nhập URL hoặc storage key ở giao diện.</p> : null}
        {canTechnicianAct && caseData.status === "COLLECTED" ? <form className={styles.formPanel} onSubmit={perform(() => { const key = operationKey("refurbishment-start", caseData.id); startRefurbishment.mutate({ id: caseData.id, workPlanned: workPlanned.trim(), estimatedPartsCost: Number(estimatedPartsCost || 0), currency: currency.trim() || caseData.currency, idempotencyKey: key, correlationId: key }); })}><h3 className={styles.sectionTitle}>Bắt đầu tân trang</h3><label className={styles.formField}><span>Kế hoạch công việc</span><textarea required value={workPlanned} onChange={(event) => setWorkPlanned(event.target.value)} /></label><label className={styles.formField}><span>Chi phí linh kiện ước tính</span><input type="number" min="0" step="0.01" value={estimatedPartsCost} onChange={(event) => setEstimatedPartsCost(event.target.value)} /></label><ButtonBar type="submit" disabled={!workPlanned.trim() || startRefurbishment.isPending}>Bắt đầu tân trang</ButtonBar></form> : null}
        {canTechnicianAct && caseData.status === "REFURBISHING" ? <form className={styles.formPanel} onSubmit={perform(() => { const key = operationKey("refurbishment-complete", caseData.id); completeRefurbishment.mutate({ id: caseData.id, workPerformed: workPerformed.trim(), result: workResult.trim(), idempotencyKey: key, correlationId: key }); })}><h3 className={styles.sectionTitle}>Hoàn tất tân trang</h3><label className={styles.formField}><span>Công việc đã làm</span><textarea required value={workPerformed} onChange={(event) => setWorkPerformed(event.target.value)} /></label><label className={styles.formField}><span>Kết quả</span><textarea required value={workResult} onChange={(event) => setWorkResult(event.target.value)} /></label><p className={styles.formHint}>API kết quả tân trang chỉ nhận evidenceReferences dạng chuỗi và chưa có private evidence upload/read cho bước này. Gửi kết quả văn bản theo contract backend; không tạo storage reference giả.</p><ButtonBar type="submit" disabled={!workPerformed.trim() || !workResult.trim() || completeRefurbishment.isPending}>Hoàn tất tân trang</ButtonBar></form> : null}
        {role === "operator" && caseData.status === "QA_PENDING" ? <div className={styles.formPanel}><h3 className={styles.sectionTitle}>Kiểm định độc lập</h3><label className={styles.formField}><span>Kết quả</span><select value={qaPassed ? "true" : "false"} onChange={(event) => setQaPassed(event.target.value === "true")}><option value="true">Đạt</option><option value="false">Chưa đạt</option></select></label><label className={styles.formField}><span>Lý do</span><textarea required value={qaReason} onChange={(event) => setQaReason(event.target.value)} /></label><ButtonBar type="button" disabled={!qaReason.trim() || decideQa.isPending} onClick={() => { const key = operationKey("qa-decision", caseData.id); decideQa.mutate({ id: caseData.id, passed: qaPassed, reason: qaReason.trim(), idempotencyKey: key, correlationId: key }); }}>Ghi nhận kiểm định</ButtonBar></div> : null}
        {commonError?.error ? <ErrorNotice error={commonError.error} /> : null}
      </section> : null}
    </main>
  );
}
