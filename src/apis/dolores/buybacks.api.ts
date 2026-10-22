import { doloresAxiosClient, parseDoloresResponse } from './client';
import { BuybackCaseIdSchema, BuybackCaseSchema } from '@/schemas/dolores/buybacks';
import type { BuybackCase } from '@/types/dolores/buybacks';

export const buybacksApi = {
  getById: async (id: string, signal?: AbortSignal): Promise<BuybackCase> => {
    const caseId = BuybackCaseIdSchema.parse(id);
    const response = await doloresAxiosClient.get<unknown>(
      `/buybacks/${encodeURIComponent(caseId)}`,
      { signal }
    );
    return parseDoloresResponse(response.data, BuybackCaseSchema);
  },
};
