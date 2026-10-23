import Image from "next/image";
import Link from "next/link";
import logoImage from "@/assets/logo.png";
import { ROUTES } from "@/routes/routes";

interface BrandLogoProps {
  href?: string;
  priority?: boolean;
  ariaLabel: string;
  brandName: string;
  brandTagline: string;
}

export function BrandLogo({
  href = ROUTES.HOME_SECTIONS.TOP,
  priority = false,
  ariaLabel,
  brandName,
  brandTagline,
}: BrandLogoProps) {
  return (
    <Link href={href} className="brand" aria-label={ariaLabel}>
      <Image
        src={logoImage}
        alt=""
        width={48}
        height={48}
        className="brand-mark"
        priority={priority}
      />
      <span className="brand-name">
        <strong>{brandName}</strong>
        <span>{brandTagline}</span>
      </span>
    </Link>
  );
}
