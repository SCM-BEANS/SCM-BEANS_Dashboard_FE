const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, mocks = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => mocks[id] || (id === "@/lib/evidence-multipart" ? require("./evidence-multipart-helper.cjs") : require(id)), module, module.exports);
  return module.exports;
}
const schema = load('src/schema/machines.schema.ts');
const caseId = '00000000-0000-4000-8000-000000000001';
const machineId = '00000000-0000-4000-8000-000000000002';
test('fallback offer validates local timestamps and posts the requested machine', async () => {
  const body = { replacementMachineId: machineId, startAt: '2026-11-06T10:00:00', endAt: '2026-11-07T10:00:00', reason: 'Unavailable' };
  let call;
  const event = { id: machineId, repairCaseId: caseId, eventType: 'FALLBACK_REPLACEMENT_OFFERED', actorRole: 'ADMIN', occurredAt: body.startAt, relatedMachineId: machineId };
  const api = load('src/apis/repair-cases.api.ts', { '@/schema/machines.schema': schema, '@/lib/http': { DOLORES_API_BASE_URL: '/api', axiosClient: { post: async (...args) => { call = args; return { data: event }; } } } }).repairCasesApi;
  await api.offerFallback(caseId, body);
  assert.deepEqual(call, [`/repair-cases/${caseId}/replacement-offers`, body, { baseURL: '/api' }]);
  await assert.rejects(api.offerFallback(caseId, { ...body, startAt: body.startAt + 'Z' }));
});
test('emergency authorization posts reason and scope and checks case identity', async () => {
  const body = { reason: 'Urgent', workScope: 'Pump' };
  let response = { ...body, id: machineId, repairCaseId: caseId, authorizedBy: machineId, actorRole: 'ADMIN', authorizedAt: '2026-11-06T10:00:00', consumedAt: null, consumedBy: null };
  let call;
  const api = load('src/apis/repair-cases.api.ts', { '@/schema/machines.schema': schema, '@/lib/http': { DOLORES_API_BASE_URL: '/api', axiosClient: { post: async (...args) => { call = args; return { data: response }; } } } }).repairCasesApi;
  await api.authorizeEmergencyWork(caseId, body);
  assert.deepEqual(call, [`/repair-cases/${caseId}/emergency-work-authorizations`, body, { baseURL: '/api' }]);
  response = { ...response, repairCaseId: machineId };
  await assert.rejects(api.authorizeEmergencyWork(caseId, body));
});

test('parses emergency authorization events, ignores malformed entries, and sorts newest first', () => {
  const { parseEmergencyAuthorizationEvents } = load('src/components/features/repair-workflow/emergency-authorizations.ts');
  const event = { eventType: 'EMERGENCY_WORK_AUTHORIZED', details: `authorizationId=${machineId};scope=Pump; seal;disputedReviewId=${caseId}`, occurredAt: '2026-01-01T00:00:00Z', actorRole: 'ADMIN', reason: 'Urgent' };
  const result = parseEmergencyAuthorizationEvents([event, { ...event, details: 'invalid' }, { ...event, occurredAt: '2026-02-01T00:00:00Z', actorRole: 'MODERATOR' }]);
  assert.equal(result.length, 2);
  assert.equal(result[0].actorRole, 'MODERATOR');
  assert.equal(result[1].workScope, 'Pump; seal');
  assert.equal(result[1].disputedReviewId, caseId);
});
