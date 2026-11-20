import Link from "next/link";
import { Fragment } from "react";

interface AdminBreadcrumbProps {
  rootLabel: string;
  rootHref?: string;
  intermediateItems?: { label: string; href?: string }[];
  currentLabel: string;
  className?: string;
}

export function AdminBreadcrumb({
  rootLabel,
  rootHref,
  intermediateItems = [],
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
      {intermediateItems.map((item, index) => (
        <Fragment key={`${index}-${item.href ?? item.label}`}>
          <span aria-hidden="true"> / </span>
          {item.href ? <Link href={item.href}><span>{item.label}</span></Link> : <span>{item.label}</span>}
        </Fragment>
      ))}
      <span aria-hidden="true"> / </span>
      <span aria-current="page">{currentLabel}</span>
    </nav>
  );
}
