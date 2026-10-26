import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { machinesApi } from "@/apis/machines.api";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { createIdempotencyKey } from "../shared/idempotency-key";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.WORKFLOWS;

export function RepairIntakeForm({ title, description }: { title: string; description: string }) {
  const [machineId, setMachineId] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [validationError, setValidationError] = useState("");
  const idempotencyKeyRef = useRef<string | null>(null);
  const machineQuery = useQuery({
    queryKey: ["owner-machines-for-repair-intake"],
    queryFn: ({ signal }) => machinesApi.list(signal),
  });
  const submitMutation = useMutation({
    mutationFn: (input: { machineId: string; issueDescription: string; idempotencyKey: string }) =>
      machinesApi.createRepairIntake(input),
    onSuccess: () => {
      setIssueDescription("");
      idempotencyKeyRef.current = null;
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!machineId || !issueDescription.trim() || issueDescription.trim().length > 4000) {
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
      <header className={styles.pageHeading}>
        <h1 id="customer-workflow-title">{title}</h1>
        <p>{description}</p>
      </header>
      <form className={styles.dataPanel} onSubmit={submit}>
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
            {validationError ? <p className={styles.errorNotice} role="alert">{validationError}</p> : null}
            {submitMutation.isError ? <p className={styles.errorNotice} role="alert">{messages.REPAIR_INTAKE_ERROR}</p> : null}
            {submitMutation.isSuccess ? <p className={styles.successNotice} role="status">{messages.REPAIR_INTAKE_SUCCESS}</p> : null}
            <button
              className={styles.primaryButton}
              disabled={submitMutation.isPending || !issueDescription.trim()}
              type="submit"
            >
              {submitMutation.isPending ? messages.REPAIR_INTAKE_SENDING : messages.REPAIR_INTAKE_SUBMIT}
            </button>
          </>
        ) : null}
      </form>
    </section>
  );
}
