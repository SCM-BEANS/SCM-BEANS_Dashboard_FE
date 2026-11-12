import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/apis/billing.api";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import styles from "@/components/features/billing/operator-invoices-screen.module.css";

const messages = CUSTOMER_MESSAGES.WORKFLOWS;

export function PaymentProofForm({
  invoiceId,
  title = messages.INVOICE_PAYMENT_TITLE,
  description = messages.INVOICE_PAYMENT_DESCRIPTION,
}: {
  invoiceId: string;
  title?: string;
  description?: string;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const mutation = useMutation({
    mutationFn: (input: { amount: number; file: File; idempotencyKey: string }) =>
      billingApi.submitPaymentProof({ invoiceId, ...input }),
    onSuccess: async () => {
      setAmount("");
      setFile(null);
      setValidationError("");
      idempotencyKeyRef.current = null;
      if (inputRef.current) inputRef.current.value = "";
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner-invoice-proofs", invoiceId] }),
        queryClient.invalidateQueries({ queryKey: ["owner-invoice", invoiceId] }),
      ]);
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending) return;
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setValidationError(messages.PAYMENT_AMOUNT_REQUIRED);
      return;
    }
    if (!file) {
      setValidationError(messages.PAYMENT_FILE_REQUIRED);
      return;
    }
    setValidationError("");
    const idempotencyKey = idempotencyKeyRef.current ?? createIdempotencyKey();
    idempotencyKeyRef.current = idempotencyKey;
    mutation.mutate({ amount: parsedAmount, file, idempotencyKey });
  };

  return (
    <form className={styles.panel} onSubmit={submit}>
      <h2>{title}</h2>
      <p className={styles.hint}>{description}</p>
      <div className={styles.proofUpload}>
      <label>
        <span>{messages.FIELD_PAYMENT_AMOUNT}</span>
        <input
          disabled={mutation.isPending}
          min="0.01"
          onChange={(event) => {
            idempotencyKeyRef.current = null;
            setValidationError("");
            setAmount(event.target.value);
          }}
          required
          step="0.01"
          type="number"
          value={amount}
        />
      </label>
      <label>
        <span>{messages.FIELD_PAYMENT_PROOF}</span>
        <input
          disabled={mutation.isPending}
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={(event) => {
            idempotencyKeyRef.current = null;
            setValidationError("");
            setFile(event.target.files?.[0] ?? null);
          }}
          ref={inputRef}
          required
          type="file"
        />
      </label>
      </div>
      {validationError && <p className={styles.errorText} role="alert">{validationError}</p>}
      {mutation.isError && <p className={styles.errorText} role="alert">{getApiErrorMessage(mutation.error, "mutation") || messages.PAYMENT_SUBMIT_ERROR}</p>}
      {mutation.isSuccess && <p className={styles.successText} role="status">{messages.PAYMENT_SUBMIT_SUCCESS}</p>}
      <div className={styles.proofUploadFooter}><ButtonBar variant="primary" disabled={mutation.isPending} type="submit">
        {mutation.isPending ? messages.ACTION_SENDING : messages.ACTION_SEND_PROOF}
      </ButtonBar></div>
    </form>
  );
}
