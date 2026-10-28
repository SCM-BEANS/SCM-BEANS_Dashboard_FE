import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  AssignMachineToModelRequestSchema,
  CreateMachineModelRequestSchema,
  MachineModelIdSchema,
  MachineModelListSchema,
  type CreateMachineModelRequest,
} from "@/schema/machine-models.schema";
import { MachineIdSchema } from "@/schema/machines.schema";

export const machineModelsApi = {
  async create(input: CreateMachineModelRequest) {
    const request = CreateMachineModelRequestSchema.parse(input);
    await axiosClient.post<unknown>("/machine-models", request, { baseURL: DOLORES_API_BASE_URL });
  },
  async assignMachineToModel(modelId: string, machineId: string, input: { reason: string }) {
    const validModelId = encodeURIComponent(MachineModelIdSchema.parse(modelId));
    const validMachineId = encodeURIComponent(MachineIdSchema.parse(machineId));
    const request = AssignMachineToModelRequestSchema.parse(input);
    await axiosClient.post<unknown>(
      `/machine-models/${validModelId}/machines/${validMachineId}`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
  },
  async list(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/machine-models", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return MachineModelListSchema.parse(response.data);
  },
};
