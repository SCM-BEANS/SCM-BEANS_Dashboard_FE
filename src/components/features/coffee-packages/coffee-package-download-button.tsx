import { useState } from "react";
import { ProgressDownloadButton } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import styles from "./coffee-package-workflow.module.css";

export function CoffeePackageDownloadButton({ filename, download }: {
  filename: string;
  download: (signal: AbortSignal, onProgress: (loaded: number, total?: number) => void) => Promise<Blob>;
}) {
  const [error, setError] = useState("");
  return <span className={styles.downloadAction}>
    <ProgressDownloadButton filename={filename} download={(signal, onProgress) => {
      setError("");
      return download(signal, onProgress);
    }} onError={(cause) => setError(getApiErrorMessage(cause))}>Tải xuống</ProgressDownloadButton>
    {error ? <span className={styles.downloadError} role="alert">{error}</span> : null}
  </span>;
}
