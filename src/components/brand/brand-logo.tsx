import Image from "next/image";
import Link from "next/link";
import logoImage from "../../../logo-converted-edited.svg";
import { PATH_HOME } from "@/routes/path";

interface BrandLogoProps {
  href?: string;
  priority?: boolean;
  ariaLabel: string;
}

export function BrandLogo({
  href = PATH_HOME.SECTIONS.TOP,
  priority = false,
  ariaLabel,
}: BrandLogoProps) {
  return (
    <Link href={href} className="brand" aria-label={ariaLabel}>
      <BrandMark priority={priority} />
      <span className="brand-name">
        <strong>dolores.</strong>
      </span>
    </Link>
  );
}

export function BrandMark({ priority = false }: { priority?: boolean }) {
  return (
    <span className="brand-mark-frame" aria-hidden="true">
      <Image
        src={logoImage}
        alt=""
        width={60}
        height={60}
        className="brand-mark"
        priority={priority}
      />
    </span>
  );
}
