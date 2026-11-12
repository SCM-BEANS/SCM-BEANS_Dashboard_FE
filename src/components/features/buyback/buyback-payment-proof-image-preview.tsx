import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { buybacksApi } from "@/apis/buybacks.api";
import { ImagePreview } from "@/components/image-preview/image-preview";
import type { BuybackPaymentProof } from "@/schema/buybacks.schema";

function normalizeBuybackMediaType(contentType: string | undefined): string | undefined {
  const mediaType = contentType?.split(";")[0].trim().toLowerCase();
  return mediaType || undefined;
}

function previewablePaymentProofImageType(contentType: string | undefined): "image/jpeg" | "image/png" | undefined {
  const mediaType = normalizeBuybackMediaType(contentType);
  return mediaType === "image/jpeg" || mediaType === "image/png" ? mediaType : undefined;
}

export function isPreviewablePaymentProofImage(contentType: string | undefined): boolean {
  return previewablePaymentProofImageType(contentType) !== undefined;
}

export function BuybackPaymentProofImagePreview({ proof }: { proof: BuybackPaymentProof }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const preview = useQuery({
    queryKey: ["dolores", "buyback-payment-proof-preview", proof.id],
    queryFn: ({ signal }) => buybacksApi.downloadPaymentProofContent(proof.id, signal),
    enabled: isVisible,
    retry: false,
    staleTime: 60_000,
    gcTime: 60_000,
  });

  useEffect(() => {
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
  }, []);

  const proofImageType = previewablePaymentProofImageType(proof.contentType);
  useEffect(() => {
    const blob = preview.data?.blob;
    if (!blob || !proofImageType) {
      setPreviewUrl("");
      return;
    }
    const imageBlob = normalizeBuybackMediaType(blob.type) === proofImageType
      ? blob
      : new Blob([blob], { type: proofImageType });
    const url = URL.createObjectURL(imageBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [preview.data?.blob, proofImageType]);

  const status = preview.isError ? "error" : !previewUrl && isVisible ? "loading" : "idle";

  return (
    <div ref={previewRef}>
      <ImagePreview src={previewUrl || undefined} alt={proof.originalFilename} status={status} />
    </div>
  );
}
