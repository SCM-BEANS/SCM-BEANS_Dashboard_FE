const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadTypescript(path, mocks = {}) {
  const fileName = join(__dirname, '..', path);
  const { outputText } = ts.transpileModule(readFileSync(fileName, 'utf8'), {
    fileName, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const loaded = { exports: {} };
  const resolve = (id) => Object.hasOwn(mocks, id) ? mocks[id]
    : id.startsWith('@/schema/') ? loadTypescript(`src/${id.slice(2)}.ts`, mocks) : require(id);
  new Function('require', 'exports', 'module', outputText)(resolve, loaded.exports, loaded);
  return loaded.exports;
}
const schema = () => loadTypescript('src/schema/owner-analytics.schema.ts');
const ownerId = '00000000-0000-4000-8000-000000000001';
const machineId = '00000000-0000-4000-8000-000000000002';
const otherMachineId = '00000000-0000-4000-8000-000000000003';
const recordId = '00000000-0000-4000-8000-000000000004';
const range = { from: '2026-11-05T17:00:00Z', to: '2026-11-06T17:00:00Z' };
const brew = { id: recordId, eventId: recordId, machineId, machineSerialNumber: 'S-018', recipeName: 'Espresso', brewedAt: '2026-11-06T02:00:00Z', receivedAt: null };
const cleaning = { id: recordId, eventId: recordId, machineId, machineSerialNumber: 'S-018', cleaningType: 'STARTUP', startedAt: '2026-11-06T00:00:00Z', finishedAt: null, coffeeCleaned: true, milkCleaned: false, heatingCompleted: false, groupheadPurged: false, status: 'ABORTED', notes: null };
const cup = { ownerId, ...range, totalCups: 1, activeMachineCount: 3, machineBreakdown: [{ machineSerialNumber: 'S-018', cups: 1 }], dailyBreakdown: [{ date: '2026-11-06', cups: 1 }], recipeBreakdown: [{ recipeName: 'Espresso', cups: 1 }] };
const page = (content, extras = {}) => ({ content, page: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, first: true, last: true, ...extras });
function apiWith(http) {
  return loadTypescript('src/apis/owner-analytics.api.ts', { '@/lib/http': { axiosClient: http, DOLORES_API_BASE_URL: '/api/dolores/v1' } }).ownerAnalyticsApi;
}

test('Owner calendar bounds are Vietnam days with exclusive end regardless of browser timezone', () => {
  const s = schema();
  assert.deepEqual(s.OwnerAnalyticsCalendarRangeSchema.parse({ fromDate: '2026-11-06', toDate: '2026-11-06' }), range);
  const monthEnd = s.OwnerAnalyticsCalendarRangeSchema.parse({ fromDate: '2026-12-31', toDate: '2026-12-31' });
  assert.deepEqual(monthEnd, { from: '2026-12-30T17:00:00Z', to: '2026-12-31T17:00:00Z' });
  for (const input of [{ fromDate: '2026-02-30', toDate: '2026-03-01' }, { fromDate: '2026-11-07', toDate: '2026-11-06' }]) {
    assert.equal(s.OwnerAnalyticsCalendarRangeSchema.safeParse(input).success, false);
  }
});

test('Owner direct date parameters use inclusive UTC dates without changing Vietnam calendar helper', () => {
  const s = schema();
  const dates = { from: '2026-11-01', to: '2026-11-08' };
  for (const validator of [s.OwnerAnalyticsRangeSchema, s.OwnerBrewRecordsParamsSchema, s.OwnerCleaningRecordsParamsSchema]) {
    const parsed = validator.parse(dates);
    assert.equal(Date.parse(parsed.from), Date.parse('2026-11-01T00:00:00Z'));
    assert.equal(Date.parse(parsed.to), Date.parse('2026-11-09T00:00:00Z'));
    const instantRange = validator.parse(range);
    assert.equal(Date.parse(instantRange.from), Date.parse(range.from));
    assert.equal(Date.parse(instantRange.to), Date.parse(range.to));
    assert.equal(validator.safeParse({ from: '2026-02-30', to: '2026-03-01' }).success, false);
  }
  const vietnam = s.OwnerAnalyticsCalendarRangeSchema.parse({ fromDate: '2026-11-01', toDate: '2026-11-08' });
  assert.equal(vietnam.from, '2026-10-31T17:00:00Z');
  assert.equal(vietnam.to, '2026-11-08T17:00:00Z');
});

test('Owner parameters reject untrusted scope, invalid ranges, paging and stale cleaning enum', () => {
  const s = schema();
  assert.equal(s.OwnerAnalyticsRangeSchema.safeParse({ ...range, machineId: 'S-018' }).success, true);
  for (const input of [{ ...range, ownerId }, { ...range, from: range.to }, { ...range, from: '2026-11-06T00:00:00' }]) {
    assert.equal(s.OwnerAnalyticsRangeSchema.safeParse(input).success, false);
  }
  const defaults = s.OwnerBrewRecordsParamsSchema.parse(range);
  assert.equal(defaults.page, 0); assert.equal(defaults.size, 20);
  assert.equal(s.OwnerBrewRecordsParamsSchema.safeParse({ ...range, page: -1 }).success, false);
  assert.equal(s.OwnerCleaningRecordsParamsSchema.safeParse({ ...range, size: 101 }).success, false);
  assert.equal(s.OwnerCleaningRecordsParamsSchema.safeParse({ ...range, status: 'INTERRUPTED' }).success, false);
  assert.equal(s.OwnerCleaningRecordsParamsSchema.safeParse({ ...range, status: 'ABORTED', cleaningType: 'CLOSING' }).success, true);
});

test('Owner read schemas preserve actual zero/null values and require correct PageResponse and timestamps', () => {
  const s = schema();
  assert.equal(s.OwnerCupCountSchema.parse({ ...cup, totalCups: 0 }).totalCups, 0);
  assert.equal(s.OwnerCupCountSchema.parse(cup).activeMachineCount, 3);
  assert.deepEqual(s.OwnerBrewRecordsPageSchema.parse(page([brew])).content, [brew]);
  assert.deepEqual(s.OwnerCleaningRecordsPageSchema.parse(page([cleaning])).content, [cleaning]);
  assert.equal(s.OwnerCleaningRecordsPageSchema.safeParse(page([{ ...cleaning, coffeeCleaned: null }])).success, false);
  assert.equal(s.OwnerBrewRecordsPageSchema.safeParse(page([{ ...brew, brewedAt: '2026-11-06T02:00:00' }])).success, false);
  assert.equal(s.OwnerBrewRecordsPageSchema.safeParse([brew]).success, false);
  assert.equal(s.OwnerBrewRecordsPageSchema.safeParse({ content: [brew] }).success, false);
  assert.equal(s.OwnerBrewRecordsPageSchema.safeParse(page([], { page: 5, totalElements: 2, totalPages: 1, first: false, last: true })).success, true);
});

test('Owner API forwards scoped filters, abort signal and PageResponse without ownerId or ingestion calls', async () => {
  const calls = [];
  const signal = new AbortController().signal;
  const api = apiWith({ get: async (url, config) => { calls.push({ url, config }); return { data: url.endsWith('cup-count') ? cup : page(url.endsWith('brew-records') ? [brew] : [cleaning]) }; } });
  assert.deepEqual(await api.getCupCount({ ...range, machineId }, signal, { ownerId, machineSerialNumber: 'S-018' }), cup);
  assert.deepEqual(await api.listBrewRecords({ ...range, machineId, recipeName: 'Espresso' }, signal), page([brew]));
  assert.deepEqual(await api.listCleaningRecords({ ...range, machineId, cleaningType: 'STARTUP', status: 'ABORTED' }, signal), page([cleaning]));
  assert.deepEqual(calls.map(c => c.url), ['/owner/cup-count', '/owner/brew-records', '/owner/cleaning-records']);
  for (const { config } of calls) { assert.equal(config.signal, signal); assert.equal(config.baseURL, '/api/dolores/v1'); assert.equal(Object.hasOwn(config.params, 'ownerId'), false); }
  assert.deepEqual(calls[1].config.params, { ...range, machineId, recipeName: 'Espresso', page: 0, size: 20 });
});

test('Owner API rejects invalid input and response context before displaying another machine or period', async () => {
  let calls = 0, response = cup;
  const api = apiWith({ get: async () => { calls++; return { data: response }; } });
  await assert.rejects(api.getCupCount({ ...range, ownerId })); assert.equal(calls, 0);
  await assert.rejects(api.listCleaningRecords({ ...range, status: 'INTERRUPTED' })); assert.equal(calls, 0);
  await assert.rejects(api.getCupCount(range, undefined, { ownerId: otherMachineId }));
  response = { ...cup, from: '2026-11-04T17:00:00Z' };
  await assert.rejects(api.getCupCount(range));
  response = { ...cup, machineBreakdown: [{ machineSerialNumber: 'OTHER', cups: 1 }] };
  await assert.rejects(api.getCupCount({ ...range, machineId }, undefined, { machineSerialNumber: 'S-018' }));
  await assert.rejects(api.getCupCount({ ...range, machineId: 'S-018' }));
  response = page([{ ...brew, machineId: otherMachineId }]);
  await assert.rejects(api.listBrewRecords({ ...range, machineId }));
  response = page([{ ...brew, machineId: otherMachineId, machineSerialNumber: machineId }]);
  await assert.rejects(api.listBrewRecords({ ...range, machineId }));
  response = page([{ ...cleaning, machineSerialNumber: 'OTHER' }]);
  await assert.rejects(api.listCleaningRecords({ ...range, machineId: 'S-018' }));
  response = page([{ ...brew, brewedAt: range.to }]);
  await assert.rejects(api.listBrewRecords({ ...range, machineId }));
});

test('Owner API propagates denied and aborted reads without fallback or automatic retries', async () => {
  const denied = Object.assign(new Error('forbidden'), { response: { status: 403 } });
  let calls = 0;
  const api = apiWith({ get: async () => { calls++; throw denied; } });
  await assert.rejects(api.listBrewRecords(range), error => error === denied);
  assert.equal(calls, 1);
  const controller = new AbortController(); controller.abort();
  const cancelled = Object.assign(new Error('cancelled'), { code: 'ERR_CANCELED' });
  const abortApi = apiWith({ get: async (_url, config) => { assert.equal(config.signal, controller.signal); throw cancelled; } });
  await assert.rejects(abortApi.listCleaningRecords(range, controller.signal), error => error === cancelled);
});

test('Owner serial filters honor backend case-insensitive resolution and canonical serial responses', async () => {
  const api = apiWith({ get: async (url) => ({ data: url.endsWith('cup-count') ? cup : page(url.endsWith('brew-records') ? [brew] : [cleaning]) }) });
  const params = { ...range, machineId: 's-018' };
  const context = { machineId, machineSerialNumber: 'S-018' };
  assert.deepEqual(await api.getCupCount(params, undefined, context), cup);
  assert.deepEqual(await api.listBrewRecords(params, undefined, context), page([brew]));
  assert.deepEqual(await api.listCleaningRecords(params, undefined, context), page([cleaning]));
});

test('Owner cleaning snapshot follows pages sequentially and reports complete only after the last page', async () => {
  const calls = [], signal = new AbortController().signal;
  const initialRows = Array.from({ length: 100 }, (_, index) => ({ ...cleaning, id: `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`, status: 'FAILED' }));
  const finalRow = { ...cleaning, status: 'COMPLETED', cleaningType: 'CLOSING' };
  let active = 0;
  const api = apiWith({ get: async (_url, config) => {
    assert.equal(active++, 0, 'snapshot must not request pages concurrently');
    assert.equal(config.signal, signal);
    calls.push(config.params);
    const currentPage = config.params.page;
    const result = page(currentPage === 0 ? initialRows : [finalRow], { page: currentPage, size: 100, totalElements: 101, totalPages: 2, first: currentPage === 0, last: currentPage === 1 });
    await Promise.resolve(); active--;
    return { data: result };
  } });
  const result = await api.getCleaningSnapshot({ ...range, machineId }, signal, { machineId });
  assert.equal(result.complete, true);
  assert.deepEqual(result.items, [...initialRows, finalRow]);
  assert.deepEqual(calls.map(params => params.page), [0, 1]);
  assert(calls.every(params => params.size === 100 && params.machineId === machineId));
});

test('Owner cleaning snapshot stops after five pages and marks remaining data incomplete', async () => {
  const calls = [];
  const api = apiWith({ get: async (_url, config) => {
    calls.push(config.params.page);
    const content = Array.from({ length: 100 }, (_, index) => ({ ...cleaning, id: `10000000-0000-4000-8000-${String(config.params.page * 100 + index).padStart(12, '0')}` }));
    return { data: page(content, { page: config.params.page, size: 100, totalElements: 600, totalPages: 6, first: config.params.page === 0, last: false }) };
  } });
  const result = await api.getCleaningSnapshot({ ...range, machineId });
  assert.equal(result.complete, false);
  assert.equal(result.items.length, 500);
  assert.deepEqual(calls, [0, 1, 2, 3, 4]);
});

test('Owner cleaning snapshot propagates later-page failures without pretending the snapshot is complete', async () => {
  const failure = new Error('cleaning page unavailable');
  const api = apiWith({ get: async (_url, config) => {
    if (config.params.page === 1) throw failure;
    return { data: page(Array.from({ length: 100 }, () => cleaning), { page: 0, size: 100, totalElements: 101, totalPages: 2, first: true, last: false }) };
  } });
  await assert.rejects(api.getCleaningSnapshot({ ...range, machineId }), error => error === failure);
});

test('Owner cleaning summaries distinguish incomplete reads, completed evidence and missing records per machine', () => {
  const { summarizeMachineCleaning, getVietnamToday } = loadTypescript('src/pages/dashboard/machines/machine-cleaning-history-panel.tsx', {
    '@/components/button/button-bar': {}, '@/components/table/data-table': {}, '@/components/machines/machines.module.css': {},
  });
  assert.deepEqual(summarizeMachineCleaning([], machineId, false), { startup: 'Chưa kiểm tra đầy đủ', closing: 'Chưa kiểm tra đầy đủ' });
  assert.deepEqual(summarizeMachineCleaning([], machineId, true), { startup: 'Chưa ghi nhận', closing: 'Chưa ghi nhận' });
  const records = [{ ...cleaning, machineId: otherMachineId, status: 'COMPLETED' }, { ...cleaning, status: 'FAILED' }];
  assert.equal(summarizeMachineCleaning(records, machineId, false).startup, 'Chưa kiểm tra đầy đủ');
  records.push({ ...cleaning, status: 'COMPLETED' });
  assert.equal(summarizeMachineCleaning(records, machineId, false).startup, 'Hoàn tất');
  assert.equal(summarizeMachineCleaning([cleaning], machineId, true).startup, 'Bị gián đoạn');
  assert.equal(getVietnamToday(new Date('2026-11-06T18:00:00Z')), '2026-11-07');
});
