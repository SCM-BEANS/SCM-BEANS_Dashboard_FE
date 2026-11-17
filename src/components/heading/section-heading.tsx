import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  children?: ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  children,
}: SectionHeadingProps) {
  const className = align === "center" ? "section-heading center" : "section-heading";

  return (
    <div className={className}>
      {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </div>
  );
}
