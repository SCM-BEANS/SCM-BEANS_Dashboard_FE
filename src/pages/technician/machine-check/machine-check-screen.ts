import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";
import type { TechnicianScreenDescriptor } from "../technician-screen";

export const technicianMachineCheckScreen: TechnicianScreenDescriptor = {
  title: TECHNICIAN_MESSAGES.NAVIGATION.MACHINE_CHECK,
  description: TECHNICIAN_MESSAGES.ROUTES.MACHINE_CHECK_DESCRIPTION,
  reason: TECHNICIAN_MESSAGES.ROUTES.MACHINE_CHECK_PENDING,
  back: null,
};
