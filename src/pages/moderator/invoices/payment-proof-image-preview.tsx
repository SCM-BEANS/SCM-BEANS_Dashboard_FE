import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { billingApi } from "@/apis/billing.api";
import { ImagePreview } from "@/components/image-preview/image-preview";
import type { PaymentProof } from "@/schema/billing.schema";

function normalizeMediaType(contentType: string | undefined): string | undefined {
  const mediaType = contentType?.split(";")[0].trim().toLowerCase();
  return mediaType || undefined;
}

export function isPreviewableInvoicePaymentProofImage(contentType: string | undefined): boolean {
  const mediaType = normalizeMediaType(contentType);
  return mediaType === "image/jpeg" || mediaType === "image/png";
}

export function InvoicePaymentProofImagePreview({ proof }: { proof: PaymentProof }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const isPreviewable = isPreviewableInvoicePaymentProofImage(proof.contentType);
  const preview = useQuery({
    queryKey: ["dolores", "moderator", "invoice-payment-proof-preview", proof.id],
    queryFn: ({ signal }) => billingApi.downloadPaymentProofContent(proof.id, signal),
    enabled: isVisible && isPreviewable,
    retry: false,
    staleTime: 60_000,
    gcTime: 60_000,
  });

  useEffect(() => {
    if (!isPreviewable) return;
    const target = previewRef.current;
    if (!target) return;
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setIsVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [isPreviewable]);

  const mediaType = normalizeMediaType(proof.contentType);
  useEffect(() => {
    const blob = preview.data;
    if (!blob || !isPreviewable) {
      setPreviewUrl("");
      return;
    }
    const imageBlob = normalizeMediaType(blob.type) === mediaType
      ? blob
      : new Blob([blob], { type: mediaType });
    const url = URL.createObjectURL(imageBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [preview.data, isPreviewable, mediaType]);

  const status = preview.isError ? "error" : !previewUrl && isVisible ? "loading" : "idle";

  return (
    <div ref={previewRef}>
      <ImagePreview src={previewUrl || undefined} alt={proof.originalFilename} status={status} />
    </div>
  );
}
