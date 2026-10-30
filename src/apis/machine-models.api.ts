import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  AssignMachineToModelRequestSchema,
  CreateMachineModelRequestSchema,
  MachineModelIdSchema,
  MachineModelListSchema,
  MachineModelSchema,
  MachineModelMappingSchema,
  type CreateMachineModelRequest,
} from "@/schema/machine-models.schema";
import { MachineIdSchema } from "@/schema/machines.schema";

export const machineModelsApi = {
  async create(input: CreateMachineModelRequest) {
    const request = CreateMachineModelRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>("/machine-models", request, { baseURL: DOLORES_API_BASE_URL });
    return MachineModelSchema.parse(response.data);
  },
  async assignMachineToModel(modelId: string, machineId: string, input: { reason: string }) {
    const validModelId = encodeURIComponent(MachineModelIdSchema.parse(modelId));
    const validMachineId = encodeURIComponent(MachineIdSchema.parse(machineId));
    const request = AssignMachineToModelRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `/machine-models/${validModelId}/machines/${validMachineId}`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    return MachineModelMappingSchema.parse(response.data);
  },
  async list(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/machine-models", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return MachineModelListSchema.parse(response.data);
  },
  async getById(id: string, signal?: AbortSignal) {
    const validId = MachineModelIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(`/machine-models/${encodeURIComponent(validId)}`, {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const model = MachineModelSchema.parse(response.data);
    if (model.id !== validId) throw new Error("Dolores returned a different machine model.");
    return model;
  },
  async update(id: string, input: CreateMachineModelRequest) {
    const validId = MachineModelIdSchema.parse(id);
    const request = CreateMachineModelRequestSchema.parse(input);
    const response = await axiosClient.put<unknown>(`/machine-models/${encodeURIComponent(validId)}`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    const model = MachineModelSchema.parse(response.data);
    if (model.id !== validId) throw new Error("Dolores returned a different machine model.");
    return model;
  },
  async deactivate(id: string) {
    const validId = MachineModelIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(`/machine-models/${encodeURIComponent(validId)}/deactivate`, undefined, {
      baseURL: DOLORES_API_BASE_URL,
    });
    const model = MachineModelSchema.parse(response.data);
    if (model.id !== validId) throw new Error("Dolores returned a different machine model.");
    return model;
  },
};
