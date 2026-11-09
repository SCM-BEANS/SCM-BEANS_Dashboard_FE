import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { PageActions } from "@/components/action-bar/page-actions";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { machinesApi } from "@/apis/machines.api";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { EVIDENCE_ACCEPT, evidenceFileError } from "@/lib/evidence-multipart";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.WORKFLOWS;

export function RepairIntakeForm({
  title,
  description,
  back,
}: {
  title: string;
  description: string;
  back?: BackButtonDestination | null;
}) {
  const router = useRouter();
  const [machineId, setMachineId] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileError = evidenceFileError(files, { min: 0, max: 1 });
  const [validationError, setValidationError] = useState("");
  const idempotencyKeyRef = useRef<string | null>(null);
  const machineQuery = useQuery({
    queryKey: ["owner-machines-for-repair-intake"],
    queryFn: ({ signal }) => machinesApi.list(signal),
  });
  const submitMutation = useMutation({
    mutationFn: (input: { machineId: string; issueDescription: string; idempotencyKey: string }) =>
      machinesApi.createRepairIntake(input, files),
    onSuccess: () => {
      setIssueDescription("");
      idempotencyKeyRef.current = null;
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!machineId || !issueDescription.trim() || issueDescription.trim().length > 4000 || fileError) {
      setValidationError(messages.REPAIR_INTAKE_VALIDATION);
      return;
    }
    setValidationError("");
    const idempotencyKey = idempotencyKeyRef.current ?? createIdempotencyKey();
    idempotencyKeyRef.current = idempotencyKey;
    submitMutation.mutate({
      machineId,
      issueDescription: issueDescription.trim(),
      idempotencyKey,
    });
  };

  return (
    <section className={styles.pageContent} aria-labelledby="customer-workflow-title">
      <BackButtonHeading
        back={back ?? null}
        title={title}
        titleId="customer-workflow-title"
        description={description}
        className={styles.pageHeading}
      />
      <form id="repair-intake-form" className={styles.dataPanel} onSubmit={submit}>
        <h2>{messages.REPAIR_INTAKE_SUBMIT}</h2>
        <p>{messages.SUPPORT_API_REASON}</p>
        {machineQuery.isPending ? <p className={styles.loadingNotice} role="status">{CUSTOMER_MESSAGES.READ_SCREENS.LOADING}</p> : null}
        {machineQuery.isError ? <p className={styles.errorNotice} role="alert">{messages.REPAIR_INTAKE_MACHINES_ERROR}</p> : null}
        {!machineQuery.isPending && !machineQuery.isError && !machineQuery.data?.length
          ? <p className={styles.emptyNotice} role="status">{messages.REPAIR_INTAKE_NO_MACHINES}</p>
          : null}
        {machineQuery.data?.length ? (
          <>
            <label className={styles.formField}>
              <span>{messages.REPAIR_INTAKE_MACHINE}</span>
              <select
                onChange={(event) => {
                  idempotencyKeyRef.current = null;
                  submitMutation.reset();
                  setMachineId(event.target.value);
                }}
                required
                value={machineId}
              >
                <option value="">{messages.FIELD_MACHINE}</option>
                {machineQuery.data.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {(machine.serialNumber || CUSTOMER_MESSAGES.READ_SCREENS.MACHINE_NO_SERIAL) + " · " + (machine.machineType || "—")}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.formField}>
              <span>{messages.REPAIR_INTAKE_DESCRIPTION}</span>
              <textarea
                maxLength={4000}
                onChange={(event) => {
                  idempotencyKeyRef.current = null;
                  submitMutation.reset();
                  setIssueDescription(event.target.value);
                }}
                placeholder={messages.REPAIR_INTAKE_DESCRIPTION_HINT}
                required
                rows={5}
                value={issueDescription}
              />
              <small>{issueDescription.length} / 4000</small>
            </label>
            <label className={styles.formField}>
              <span>Chứng từ (nếu có)</span>
              <input type="file" accept={EVIDENCE_ACCEPT} onChange={(event) => { setFiles(Array.from(event.target.files ?? [])); idempotencyKeyRef.current = null; }} />
              {files.map((file) => <small key={file.name}>{file.name}</small>)}
            </label>
            {validationError ? <p className={styles.errorNotice} role="alert">{validationError}</p> : null}
            {submitMutation.isError ? <p className={styles.errorNotice} role="alert">{messages.REPAIR_INTAKE_ERROR}</p> : null}
            {submitMutation.isSuccess ? <p className={styles.successNotice} role="status">{messages.REPAIR_INTAKE_SUCCESS}</p> : null}

          </>
        ) : null}
      </form>
      <PageActions actions={[
        { id: "repair-intake-cancel", label: "Hủy", variant: "secondary", onClick: () => { void router.push("/dashboard/support"); }, ...(machineId || issueDescription || files.length ? { confirm: { title: "Hủy yêu cầu?", description: "Thông tin đã nhập sẽ bị mất.", confirmLabel: "Hủy yêu cầu" } } : {}) },
        { id: "repair-intake-submit", label: messages.REPAIR_INTAKE_SUBMIT, variant: "primary", type: "submit", form: "repair-intake-form", disabled: !machineId || !issueDescription.trim() || issueDescription.trim().length > 4000 || machineQuery.isPending || machineQuery.isError || Boolean(fileError), disabledReason: fileError ?? "Chọn máy và nhập nội dung yêu cầu.", pending: submitMutation.isPending, pendingLabel: messages.REPAIR_INTAKE_SENDING },
      ]} />
    </section>
  );
}
