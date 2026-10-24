import Link from "next/link";

interface AdminBreadcrumbProps {
  rootLabel: string;
  rootHref?: string;
  currentLabel: string;
  className?: string;
}

export function AdminBreadcrumb({
  rootLabel,
  rootHref,
  currentLabel,
  className,
}: AdminBreadcrumbProps) {
  return (
    <nav className={className} aria-label="Đường dẫn">
      {rootHref ? (
        <Link href={rootHref}>
          <span>{rootLabel}</span>
        </Link>
      ) : (
        <span>{rootLabel}</span>
      )}
      <span aria-hidden="true"> / </span>
      <span aria-current="page">{currentLabel}</span>
    </nav>
  );
}
