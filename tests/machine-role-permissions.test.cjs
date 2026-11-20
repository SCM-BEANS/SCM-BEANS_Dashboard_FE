const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const read = (path) => readFileSync(join(__dirname, '..', 'src', path), 'utf8');

test('moderator machine screens do not request restricted heartbeat, telemetry, certificates or menu APIs', () => {
  for (const path of ['pages/moderator/machines/machines-screen.tsx', 'pages/moderator/iot/iot-screen.tsx', 'pages/moderator/machines/machine-operational-overview-screen.tsx']) {
    assert.doesNotMatch(read(path), /getLatestHeartbeat|listMachinePoints|getCleaningCompliance|machineCertificatesApi|MachineActiveMenuPanel/, path);
  }
  const location = read('components/features/locations/location-detail-panel.tsx');
  assert.match(location, /enabled: role !== "MODERATOR"/);
  assert.match(location, /columns=\{role === "MODERATOR" \? columns\.filter/);
  assert.match(read('pages/moderator/machines/machine-operational-overview-screen.tsx'), /canReadTelemetry=\{false\}/);
  assert.match(read('components/machines/machine-health-panel.tsx'), /canReadTelemetry && key === "thermal" && showTemperature/);
});

test('technician reuses history and SLA components without gaining identity mutations or offline review decisions', () => {
  const screen = read('pages/technician/machine-check/machine-detail-screen.tsx');
  assert.match(screen, /<MachineRecordsSection/);
  assert.match(screen, /<MachineCleaningCompliancePanel/);
  assert.match(screen, /enabled: smartIot && activeSection === "cleaning" && !isMaintenanceTicketDetail/);
  assert.match(screen, /if \(isForbidden\(certificates.error\)\)/);
  assert.match(screen, /activeSection === "certificates" && <div/);
  assert.doesNotMatch(screen, /return showUnavailable \?/);
  assert.doesNotMatch(screen, /registerDeviceIdentity|revokeDeviceIdentity|OfflineReviewPanel|offlineViolationReviewsApi/);
  assert.match(read('pages/dashboard/machines/machine-operational-overview-screen.tsx'), /canDecide=\{false\}/);
});
