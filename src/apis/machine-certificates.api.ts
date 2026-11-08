import { z } from "zod";
import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import { MachineIdSchema } from "@/schema/machines.schema";
import { CertificateListParamsSchema, MachineCertificateSchema, MachineCertificateDetailSchema, MachineCertificatePageSchema } from "@/schema/machine-certificates.schema";

const path = (machineId: string) => `/machines/${encodeURIComponent(MachineIdSchema.parse(machineId))}/certificates`;
const detailPath = (machineId: string, certificateId: string) => `${path(machineId)}/${encodeURIComponent(z.string().uuid().parse(certificateId))}`;
function checkIdentity<T extends { machineId: string; id: string }>(certificate: T, machineId: string, certificateId?: string): T {
  if (certificate.machineId !== machineId || certificateId && certificate.id !== certificateId) {
    throw new Error("Certificate does not match the requested machine or certificate UUID.");
  }
  return certificate;
}

export const machineCertificatesApi = {
  async list(machineId: string, input: z.input<typeof CertificateListParamsSchema> = {}, signal?: AbortSignal) {
    const params = CertificateListParamsSchema.parse(input);
    const response = await axiosClient.get<unknown>(path(machineId), { baseURL: DOLORES_API_BASE_URL, params, signal });
    const page = MachineCertificatePageSchema.parse(response.data);
    if (page.number !== params.page || page.size !== params.size) throw new Error("Certificate page does not match the requested page.");
    page.content.forEach((certificate) => {
      checkIdentity(certificate, machineId);
      if (params.status && certificate.status !== params.status) throw new Error("Certificate status does not match the requested filter.");
    });
    return page;
  },
  async getById(machineId: string, certificateId: string, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>(detailPath(machineId, certificateId), { baseURL: DOLORES_API_BASE_URL, signal });
    return checkIdentity(MachineCertificateDetailSchema.parse(response.data), machineId, certificateId);
  },
  async issue(machineId: string) {
    const response = await axiosClient.post<unknown>(path(machineId), undefined, { baseURL: DOLORES_API_BASE_URL });
    if (response.status !== 201) throw new Error("Certificate issuance was not confirmed with HTTP 201.");
    return checkIdentity(MachineCertificateSchema.parse(response.data), machineId);
  },
  async delete(machineId: string, certificateId: string) {
    const response = await axiosClient.delete(detailPath(machineId, certificateId), { baseURL: DOLORES_API_BASE_URL });
    if (response.status !== 204) throw new Error("Certificate deletion was not confirmed with HTTP 204.");
  },
  async download(machineId: string, certificateId: string, format: "zip" | "json" = "zip", signal?: AbortSignal) {
    z.enum(["zip", "json"]).parse(format);
    const response = await axiosClient.get<Blob>(`${detailPath(machineId, certificateId)}/download`, {
      baseURL: DOLORES_API_BASE_URL, params: { format }, signal, responseType: "blob",
      headers: { Accept: format === "zip" ? "application/zip" : "application/json", "Cache-Control": "no-cache" },
    });
    const blob = response.data;
    if (response.status !== 200 || !(blob instanceof Blob) || !blob.size) throw new Error("Invalid certificate bundle response.");
    const contentType = blob.type.split(";")[0].trim().toLowerCase();
    if (contentType !== (format === "zip" ? "application/zip" : "application/json")) throw new Error("Unexpected certificate bundle content type.");
    if (format === "zip") {
      const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
      if (header[0] !== 0x50 || header[1] !== 0x4b || header[2] !== 3 || header[3] !== 4) throw new Error("Invalid certificate ZIP bundle.");
    } else {
      try {
        z.object({ caCrtPem: z.string().min(1), clientCrtPem: z.string().min(1), clientKeyPem: z.string().min(1) }).parse(JSON.parse(await blob.text()));
      } catch { throw new Error("Invalid certificate JSON bundle."); }
    }
    return { blob, filename: `machine-${machineId}-certificate-${certificateId}.${format}` };
  },
};
