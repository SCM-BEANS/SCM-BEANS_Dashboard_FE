import styles from "./truncated-id.module.css";

export function TruncatedId({
  value,
  length = 12,
}: {
  value: string | null | undefined;
  length?: number;
}) {
  if (!value) return "—";

  const visibleLength = Math.min(12, Math.max(8, Math.floor(length)));
  const isTruncated = value.length > visibleLength;

  return (
    <span className={styles.id} title={value} aria-label={value}>
      {isTruncated ? `${value.slice(0, visibleLength)}…` : value}
    </span>
  );
}
