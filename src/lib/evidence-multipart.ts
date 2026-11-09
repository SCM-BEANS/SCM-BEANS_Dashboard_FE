export const EVIDENCE_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export const EVIDENCE_MAX_FILE_BYTES = 20 * 1024 * 1024;
export const EVIDENCE_MAX_TOTAL_BYTES = 25 * 1024 * 1024;

const MIN_FILE_BYTES = 8;

export function validateEvidenceFiles(
  files: readonly File[],
  { min, max }: { min: number; max: number },
): void {
  if (files.length < min) {
    throw new Error(
      min === 1
        ? "Cần đính kèm ít nhất 1 tệp chứng từ."
        : `Cần đính kèm ít nhất ${min} tệp chứng từ.`,
    );
  }

  if (files.length > max) {
    throw new Error(`Chỉ được đính kèm tối đa ${max} tệp chứng từ.`);
  }

  let totalBytes = 0;

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Tệp ${file.name} phải là PDF, JPEG hoặc PNG.`);
    }

    if (file.size < MIN_FILE_BYTES) {
      throw new Error(`Tệp ${file.name} quá nhỏ hoặc rỗng.`);
    }

    if (file.size > EVIDENCE_MAX_FILE_BYTES) {
      throw new Error(`Tệp ${file.name} vượt quá 20 MB.`);
    }

    totalBytes += file.size;
  }

  if (totalBytes > EVIDENCE_MAX_TOTAL_BYTES) {
    throw new Error("Tổng dung lượng chứng từ vượt quá 25 MB.");
  }
}

export function evidenceFileError(
  files: readonly File[],
  limits: { min: number; max: number },
): string | null {
  try {
    validateEvidenceFiles(files, limits);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function buildEvidenceForm(data: unknown, files: readonly File[]): FormData {
  const form = new FormData();
  form.append("data", new Blob([JSON.stringify(data)], { type: "application/json" }));

  for (const file of files) {
    form.append("files", file, file.name);
  }

  return form;
}

export const EVIDENCE_MULTIPART_HEADERS = { "Content-Type": "multipart/form-data" } as const;
