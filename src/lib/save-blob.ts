const UNSAFE_FILENAME_CHARACTERS = /[\\/:*?"<>|\u0000-\u001f]/g;

export function saveBlob(blob: Blob, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Chỉ có thể lưu tệp trong trình duyệt.");
  }
  const safeName = filename.replace(UNSAFE_FILENAME_CHARACTERS, "_").slice(0, 180) || "evidence";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
