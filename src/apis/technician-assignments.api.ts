import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import { MachineIdSchema } from "@/schema/machines.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import { TechnicianMachineAssignmentResponseSchema } from "@/schema/technician-assignments.schema";

function technicianMachinePath(technicianId: string, machineId: string): string {
  const validTechnicianId = ProfileIdSchema.parse(technicianId);
  const validMachineId = MachineIdSchema.parse(machineId);
  return `/technician-assignments/${encodeURIComponent(validTechnicianId)}/machines/${encodeURIComponent(validMachineId)}`;
}

export class TechnicianMachineAssignmentIdentityMismatchError extends Error {
  constructor() {
    super("Dolores returned a different Technician or machine assignment than requested.");
    this.name = "TechnicianMachineAssignmentIdentityMismatchError";
  }
}

export const technicianAssignmentsApi = {
  async assign(technicianId: string, machineId: string) {
    const response = await axiosClient.post<unknown>(
      technicianMachinePath(technicianId, machineId),
      undefined,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const assignment = TechnicianMachineAssignmentResponseSchema.parse(response.data);
    if (assignment.idaasUserId !== technicianId || assignment.machineId !== machineId) {
      throw new TechnicianMachineAssignmentIdentityMismatchError();
    }
    return assignment;
  },

  async revoke(technicianId: string, machineId: string) {
    await axiosClient.delete(technicianMachinePath(technicianId, machineId), {
      baseURL: DOLORES_API_BASE_URL,
    });
  },
};
