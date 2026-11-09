const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadTypescript(path, mocks = {}) {
  const fileName = join(__dirname, '..', path);
  const { outputText } = ts.transpileModule(readFileSync(fileName, 'utf8'), { fileName, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  const loaded = { exports: {} };
  const resolve = id => Object.hasOwn(mocks, id) ? mocks[id] : id.startsWith('@/schema/') ? loadTypescript(`src/${id.slice(2)}.ts`, mocks) : require(id);
  new Function('require', 'exports', 'module', outputText)(resolve, loaded.exports, loaded);
  return loaded.exports;
}
const schema = () => loadTypescript('src/schema/offline-violation-reviews.schema.ts');
const id = '00000000-0000-4000-8000-000000000001';
const ownerId = '00000000-0000-4000-8000-000000000002';
const contractId = '00000000-0000-4000-8000-000000000003';
const machineId = '00000000-0000-4000-8000-000000000004';
const localTimestamp = '2026-11-06T08:30:00.123456';
const review = { id, ownerId, contractId, machineId, policyVersionId: contractId, policyVersion: 1, offlineLimitMinutes: 60, status: 'REVIEW_REQUIRED', source: 'VALKEY_HEARTBEAT_TTL', detectedAt: localTimestamp, lastObservedAt: localTimestamp, observedOfflineSince: localTimestamp, observedOfflineUntil: null, reviewRequiredAt: localTimestamp, decision: null, reviewerId: null, reviewerRole: null, decisionReason: null, evidenceReferences: null, decidedAt: null };
const decision = { decision: 'FOLLOW_UP', reason: 'Contact store', evidenceReferences: 'private://offline-review/evidence-123' };
const reviewed = { ...review, status: 'REVIEWED', decision: decision.decision, reviewerId: 'operator-profile-key', reviewerRole: 'MODERATOR', decisionReason: decision.reason, evidenceReferences: decision.evidenceReferences, decidedAt: localTimestamp };
const headers = { 'x-page': '0', 'x-page-size': '50', 'x-has-next': 'false' };
function apiWith(http) {
  return loadTypescript('src/apis/offline-violation-reviews.api.ts', { '@/lib/http': { axiosClient: http, DOLORES_API_BASE_URL: '/api/dolores/v1' } }).offlineViolationReviewsApi;
}

test('offline schema preserves LocalDateTime strings and exact workflow status without inventing UTC', () => {
  const s = schema();
  assert.equal(s.OfflineViolationReviewSchema.parse(review).detectedAt, localTimestamp);
  assert.equal(s.OfflineViolationReviewSchema.parse(reviewed).reviewerId, 'operator-profile-key');
  assert.equal(s.OfflineViolationReviewSchema.safeParse({ ...review, status: 'OFFLINE' }).success, false);
  assert.equal(s.OfflineViolationReviewSchema.safeParse({ ...review, detectedAt: 'not-a-date' }).success, false);
  assert.equal(s.OfflineViolationReviewSchema.safeParse({ ...review, detectedAt: '2026-02-30T08:30:00' }).success, false);
});

test('offline decision schema trims input and enforces private evidence reference and both length limits', () => {
  const s = schema();
  assert.deepEqual(s.OfflineViolationReviewDecisionRequestSchema.parse({ decision: 'FOLLOW_UP', reason: '  Contact store  ', evidenceReferences: '  private://evidence/x  ' }), { decision: 'FOLLOW_UP', reason: 'Contact store', evidenceReferences: 'private://evidence/x' });
  for (const input of [{ ...decision, decision: 'PENALTY' }, { ...decision, reason: ' ' }, { ...decision, reason: 'x'.repeat(2001) }, { ...decision, evidenceReferences: '' }, { ...decision, evidenceReferences: 'https://public.example/evidence' }, { ...decision, evidenceReferences: 'private://' + 'x'.repeat(2000) }]) {
    assert.equal(s.OfflineViolationReviewDecisionRequestSchema.safeParse(input).success, false);
  }
  assert.equal(s.OfflineViolationReviewListParamsSchema.safeParse({ page: -1 }).success, false);
  assert.equal(s.OfflineViolationReviewListParamsSchema.safeParse({ size: 101 }).success, false);
  assert.equal(s.OfflineViolationReviewListParamsSchema.safeParse({ machineId: 'S-018' }).success, false);
});

test('offline list forwards filters and signal and reads actual case-insensitive paging headers', async () => {
  const calls = [], signal = new AbortController().signal;
  let responseHeaders = { 'X-Page': '1', 'X-Page-Size': '2', 'X-Has-Next': 'true' };
  const api = apiWith({ get: async (url, config) => { calls.push({ url, config }); return { data: [review], headers: responseHeaders }; } });
  const params = { ownerId, contractId, machineId, status: 'REVIEW_REQUIRED', page: 1, size: 2 };
  assert.deepEqual(await api.listPage(params, signal), { items: [review], page: 1, size: 2, hasNext: true });
  assert.deepEqual(calls[0], { url: '/offline-violation-reviews', config: { baseURL: '/api/dolores/v1', signal, params } });
  responseHeaders = { get: key => ({ 'x-page': '0', 'x-page-size': '50', 'x-has-next': 'false' })[key.toLowerCase()] };
  assert.deepEqual(await api.listPage(), { items: [review], page: 0, size: 50, hasNext: false });
});

test('offline list refuses missing or malformed paging metadata and mismatched filtered records', async () => {
  let data = [review], responseHeaders = headers;
  const api = apiWith({ get: async () => ({ data, headers: responseHeaders }) });
  for (const invalid of [{}, { ...headers, 'x-page': 'bad' }, { ...headers, 'x-page-size': '0' }, { ...headers, 'x-has-next': 'maybe' }]) {
    responseHeaders = invalid; await assert.rejects(api.listPage());
  }
  responseHeaders = headers;
  data = [{ ...review, machineId: id }];
  await assert.rejects(api.listPage({ machineId }));
  data = [review];
  await assert.rejects(api.listPage({ ownerId: id }));
});

test('offline detail validates id and expected resource scope and propagates authorization errors', async () => {
  let response = review, calls = 0;
  const signal = new AbortController().signal;
  const api = apiWith({ get: async (url, config) => { calls++; assert.equal(url, `/offline-violation-reviews/${id}`); assert.equal(config.signal, signal); return { data: response }; } });
  assert.deepEqual(await api.getById(id, signal, { ownerId, contractId, machineId }), review);
  await assert.rejects(api.getById('invalid', signal)); assert.equal(calls, 1);
  response = { ...review, id: ownerId }; await assert.rejects(api.getById(id, signal));
  response = review; await assert.rejects(api.getById(id, signal, { machineId: id }));
  const forbidden = Object.assign(new Error('forbidden'), { response: { status: 403 } });
  let deniedCalls = 0;
  const denied = apiWith({ get: async () => { deniedCalls++; throw forbidden; } });
  await assert.rejects(denied.getById(id), error => error === forbidden); assert.equal(deniedCalls, 1);
});

test('offline decision sends one bounded JSON request and requires matching reviewed result', async () => {
  const calls = []; let data = reviewed;
  const api = apiWith({ post: async (url, body, config) => { calls.push({ url, body, config }); return { data }; } });
  assert.deepEqual(await api.decide(id, decision, { ownerId, contractId, machineId }), reviewed);
  assert.deepEqual(calls, [{ url: `/offline-violation-reviews/${id}/decision`, body: decision, config: { baseURL: '/api/dolores/v1' } }]);
  await assert.rejects(api.decide(id, { ...decision, reason: '' })); assert.equal(calls.length, 1);
  await assert.rejects(api.decide('invalid', decision)); assert.equal(calls.length, 1);
  for (const invalid of [{ ...reviewed, id: ownerId }, { ...reviewed, status: 'REVIEW_REQUIRED' }, { ...reviewed, decision: 'NO_ACTION' }, { ...reviewed, machineId: id }]) {
    data = invalid; await assert.rejects(api.decide(id, decision, { machineId }));
  }
  const conflict = Object.assign(new Error('conflict'), { response: { status: 409 } }); let conflictCalls = 0;
  const conflicting = apiWith({ post: async () => { conflictCalls++; throw conflict; } });
  await assert.rejects(conflicting.decide(id, decision), error => error === conflict); assert.equal(conflictCalls, 1);
});

function panelWith(props = {}) {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { OfflineReviewPanel } = loadTypescript('src/components/machines/offline-review-panel.tsx', {
    '@/components/button/button-bar': { ButtonBar: ({ children, ...rest }) => React.createElement('button', rest, children) },
    '@/components/action-bar/page-actions': { PageActions: ({ actions }) => React.createElement('footer', { 'aria-label': 'Thao tác trang' }, actions.map((action) => React.createElement('button', { key: action.id, type: action.type ?? 'button', disabled: action.disabled }, action.label))) },
    '@/components/evidence/evidence-list': { EvidenceList: () => null },
    '@/components/table/data-table': { DataTable: ({ rows, columns }) => React.createElement('table', {}, React.createElement('tbody', {}, rows.map(row => React.createElement('tr', { key: row.id }, columns.map(column => React.createElement('td', { key: column.key }, column.render(row))))))) },
    '@/components/notification-dialog/notification-dialog': { NotificationDialog: () => null },
    './machines.module.css': new Proxy({}, { get: (_target, property) => String(property) }),
  });
  return renderToStaticMarkup(React.createElement(OfflineReviewPanel, {
    page: { items: [review], page: 0, size: 50, hasNext: false }, detail: review,
    status: '', machineId, canDecide: false, onFilterChange() {}, onPageChange() {}, onSelect() {}, onRefresh() {}, async onDecide() {}, ...props,
  }));
}

test('offline presentation is read only for Owner and preserves server local time without timezone conversion', () => {
  const html = panelWith();
  assert.match(html, /Rà soát mất kết nối/);
  assert.match(html, /08:30:00 06\/11\/2026/);
  assert.match(html, /giờ máy chủ/);
  assert.match(html, /Cần rà soát/);
  assert.doesNotMatch(html, /name="reason"|name="evidenceReferences"/);
  assert.doesNotMatch(html, /type="file"/);
});

test('offline decisions are only available to operators for REVIEW_REQUIRED records', () => {
  const editable = panelWith({ canDecide: true });
  assert.match(editable, /name="reason"/);
  assert.match(editable, /name="evidenceReferences"/);
  assert.match(editable, /maxLength="2000"/);
  assert.match(editable, /Tiếp tục xác nhận/);
  assert.doesNotMatch(panelWith({ canDecide: true, detail: reviewed }), /name="reason"/);
  assert.match(panelWith({ detail: reviewed }), /Contact store/);
});
test('offline URL query validates scoped filters and preserves explicit paging and selection', () => {
  const { readOfflineReviewQuery } = loadTypescript('src/apis/offline-violation-reviews.api.ts', { '@/lib/http': {} });
  assert.deepEqual(readOfflineReviewQuery({ reviewPage: '2', reviewStatus: 'REVIEW_REQUIRED', machineId, reviewId: id, keep: 'value' }), { params: { page: 2, size: 50, status: 'REVIEW_REQUIRED', machineId }, reviewId: id });
  assert.deepEqual(readOfflineReviewQuery({}, { machineId }), { params: { page: 0, size: 50, machineId }, reviewId: undefined });
  for (const query of [{ reviewPage: '-1' }, { reviewPage: ['0', '1'] }, { reviewStatus: 'OFFLINE' }, { reviewId: 'invalid' }, { machineId: 'invalid' }]) assert.throws(() => readOfflineReviewQuery(query));
  assert.throws(() => readOfflineReviewQuery({ machineId: id }, { machineId }));
});

test('offline guarded decision refreshes state before POST and never posts an already-reviewed record', async () => {
  const calls = [];
  let current = review;
  const api = apiWith({ get: async () => { calls.push('GET'); return { data: current }; }, post: async () => { calls.push('POST'); return { data: reviewed }; } });
  assert.deepEqual(await api.decideIfRequired(id, decision, { machineId }), reviewed);
  assert.deepEqual(calls, ['GET', 'POST']);
  calls.length = 0;
  current = reviewed;
  await assert.rejects(api.decideIfRequired(id, decision, { machineId }));
  assert.deepEqual(calls, ['GET']);
  calls.length = 0;
  await assert.rejects(api.decideIfRequired(id, { ...decision, reason: '' }, { machineId }));
  assert.deepEqual(calls, []);
});

test('offline guarded decision stops on stale scope and never retries a failed POST', async () => {
  const calls = [];
  const outOfScope = apiWith({
    get: async () => { calls.push('GET'); return { data: { ...review, machineId: ownerId } }; },
    post: async () => { calls.push('POST'); return { data: reviewed }; },
  });
  await assert.rejects(outOfScope.decideIfRequired(id, decision, { machineId }));
  assert.deepEqual(calls, ['GET']);

  const forbidden = Object.assign(new Error('forbidden'), { response: { status: 403 } });
  calls.length = 0;
  const denied = apiWith({
    get: async () => { calls.push('GET'); throw forbidden; },
    post: async () => { calls.push('POST'); return { data: reviewed }; },
  });
  await assert.rejects(denied.decideIfRequired(id, decision, { machineId }), error => error === forbidden);
  assert.deepEqual(calls, ['GET']);

  for (const failure of [
    Object.assign(new Error('conflict'), { response: { status: 409 } }),
    Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }),
  ]) {
    calls.length = 0;
    const noRetry = apiWith({
      get: async () => { calls.push('GET'); return { data: review }; },
      post: async () => { calls.push('POST'); throw failure; },
    });
    await assert.rejects(noRetry.decideIfRequired(id, decision, { machineId }), error => error === failure);
    assert.deepEqual(calls, ['GET', 'POST']);
  }
});
