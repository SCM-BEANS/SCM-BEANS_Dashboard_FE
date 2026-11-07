import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import { MachineIdSchema } from "@/schema/machines.schema";
import {
  OwnerAnalyticsRangeSchema, OwnerAnalyticsContextSchema, OwnerCupCountSchema,
  OwnerBrewRecordsParamsSchema, OwnerBrewRecordsPageSchema,
  OwnerCleaningRecordsParamsSchema, OwnerCleaningRecordsPageSchema,
  OWNER_CLEANING_SNAPSHOT_MAX_PAGES, OWNER_CLEANING_SNAPSHOT_PAGE_SIZE,
  type OwnerAnalyticsRange, type OwnerAnalyticsContext,
  type OwnerBrewRecordsParams, type OwnerCleaningRecordsParams, type OwnerCleaningRecord,
} from "@/schema/owner-analytics.schema";

// MachineResolverService accepts case-insensitive serials and canonical UUIDs.
const sameIdentifier = (actual: string, expected: string) => actual.toLowerCase() === expected.toLowerCase();

function validateContext(params: OwnerAnalyticsRange, input: OwnerAnalyticsContext) {
  const context = OwnerAnalyticsContextSchema.parse(input);
  if (params.machineId && context.machineId) {
    const expected = MachineIdSchema.safeParse(params.machineId).success ? context.machineId : context.machineSerialNumber;
    if (!expected || !sameIdentifier(params.machineId, expected)) throw new Error("Máy yêu cầu không khớp ngữ cảnh đang xem.");
  }
  return context;
}

function validateRecord(
  record: { machineId: string; machineSerialNumber: string },
  params: OwnerAnalyticsRange, context: OwnerAnalyticsContext, timestamp: string,
) {
  const filteredIdentity = params.machineId && (MachineIdSchema.safeParse(params.machineId).success ? record.machineId : record.machineSerialNumber);
  if ((params.machineId && filteredIdentity && !sameIdentifier(filteredIdentity, params.machineId))
    || (context.machineId && !sameIdentifier(record.machineId, context.machineId))
    || (context.machineSerialNumber && !sameIdentifier(record.machineSerialNumber, context.machineSerialNumber))
    || Date.parse(timestamp) < Date.parse(params.from) || Date.parse(timestamp) >= Date.parse(params.to)) {
    throw new Error("Dữ liệu vận hành trả về không khớp máy hoặc khoảng thời gian yêu cầu.");
  }
}

function validatePage(page: { page: number; size: number }, params: { page: number; size: number }) {
  if (page.page !== params.page || page.size !== params.size) {
    throw new Error("Trang dữ liệu trả về không khớp yêu cầu.");
  }
}

export const ownerAnalyticsApi = {
  async getCupCount(input: OwnerAnalyticsRange, signal?: AbortSignal, expected: OwnerAnalyticsContext = {}) {
    const params = OwnerAnalyticsRangeSchema.parse(input);
    const context = validateContext(params, expected);
    const response = await axiosClient.get<unknown>("/owner/cup-count", {
      baseURL: DOLORES_API_BASE_URL, params, signal,
    });
    const result = OwnerCupCountSchema.parse(response.data);
    const expectedSerial = context.machineSerialNumber
      ?? (params.machineId && !MachineIdSchema.safeParse(params.machineId).success ? params.machineId : undefined);
    if ((context.ownerId && !sameIdentifier(result.ownerId, context.ownerId))
      || Date.parse(result.from) !== Date.parse(params.from) || Date.parse(result.to) !== Date.parse(params.to)
      || (expectedSerial && result.machineBreakdown.some((row) => !sameIdentifier(row.machineSerialNumber, expectedSerial)))) {
      throw new Error("Số ly trả về không khớp chủ sở hữu, máy hoặc khoảng thời gian yêu cầu.");
    }
    return result;
  },
  async listBrewRecords(input: OwnerBrewRecordsParams, signal?: AbortSignal, expected: OwnerAnalyticsContext = {}) {
    const params = OwnerBrewRecordsParamsSchema.parse(input);
    const context = validateContext(params, expected);
    const response = await axiosClient.get<unknown>("/owner/brew-records", {
      baseURL: DOLORES_API_BASE_URL, params, signal,
    });
    const result = OwnerBrewRecordsPageSchema.parse(response.data);
    validatePage(result, params);
    for (const row of result.content) {
      validateRecord(row, params, context, row.brewedAt);
      if (params.recipeName && row.recipeName !== params.recipeName) throw new Error("Công thức trả về không khớp bộ lọc.");
    }
    return result;
  },
  async listCleaningRecords(input: OwnerCleaningRecordsParams, signal?: AbortSignal, expected: OwnerAnalyticsContext = {}) {
    const params = OwnerCleaningRecordsParamsSchema.parse(input);
    const context = validateContext(params, expected);
    const response = await axiosClient.get<unknown>("/owner/cleaning-records", {
      baseURL: DOLORES_API_BASE_URL, params, signal,
    });
    const result = OwnerCleaningRecordsPageSchema.parse(response.data);
    validatePage(result, params);
    for (const row of result.content) {
      validateRecord(row, params, context, row.startedAt);
      if ((params.cleaningType && row.cleaningType !== params.cleaningType) || (params.status && row.status !== params.status)) {
        throw new Error("Bản ghi vệ sinh trả về không khớp bộ lọc.");
      }
    }
    return result;
  },
  async getCleaningSnapshot(input: OwnerAnalyticsRange, signal?: AbortSignal, expected: OwnerAnalyticsContext = {}) {
    const params = OwnerAnalyticsRangeSchema.parse(input);
    const items: OwnerCleaningRecord[] = [];
    for (let page = 0; page < OWNER_CLEANING_SNAPSHOT_MAX_PAGES; page += 1) {
      signal?.throwIfAborted();
      const result = await ownerAnalyticsApi.listCleaningRecords({
        ...params, page, size: OWNER_CLEANING_SNAPSHOT_PAGE_SIZE,
      }, signal, expected);
      items.push(...result.content);
      if (result.last) return { items, complete: true };
    }
    return { items, complete: false };
  },
};
