import Image from "next/image";
import Link from "next/link";
import logoImage from "@/assets/logo.png";

interface BrandLogoProps {
  href?: string;
  priority?: boolean;
}

export function BrandLogo({ href = "#top", priority = false }: BrandLogoProps) {
  return (
    <Link href={href} className="brand" aria-label="DOLORES COFFEE trang chủ">
      <Image
        src={logoImage}
        alt=""
        width={48}
        height={48}
        className="brand-mark"
        priority={priority}
      />
      <span className="brand-name">
        <strong>DOLORES</strong>
        <span>COFFEE</span>
      </span>
    </Link>
  );
}
