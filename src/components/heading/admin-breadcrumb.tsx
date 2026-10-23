interface AdminBreadcrumbProps {
  rootLabel: string;
  currentLabel: string;
  className?: string;
}

export function AdminBreadcrumb({
  rootLabel,
  currentLabel,
  className,
}: AdminBreadcrumbProps) {
  return (
    <nav className={className} aria-label="Đường dẫn">
      <span>{rootLabel}</span>
      <span aria-hidden="true"> / </span>
      <span aria-current="page">{currentLabel}</span>
    </nav>
  );
}
