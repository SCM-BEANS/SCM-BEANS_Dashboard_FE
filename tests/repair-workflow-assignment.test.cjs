const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const assignmentScreen = readFileSync(join(__dirname, "../src/components/features/repair-workflow/maintenance-request-assignment-screen.tsx"), "utf8");

test("ticket assignment is unavailable to Moderator in the shared role screen", () => {
  assert.match(assignmentScreen, /const isAdmin = role === "admin"/);
  assert.match(assignmentScreen, /enabled: isAdmin && validId/);
  assert.match(assignmentScreen, /if \(!isAdmin\) throw new Error\(messages\.TECHNICAL_ASSIGNMENT_ADMIN_REQUIRED\);[\s\S]*?return machinesApi\.assignMaintenanceTicket/);
  assert.match(assignmentScreen, /!isAdmin \|\|[\s\S]*?ticketAssignmentMutation\.mutate/);
  assert.match(assignmentScreen, /\) : !isAdmin \?[\s\S]*?TECHNICAL_ASSIGNMENT_ADMIN_REQUIRED/);
});

test("Admin technician selection searches and paginates only eligible profiles", () => {
  assert.match(assignmentScreen, /profile\.status === "ACTIVE" && profile\.emailVerified && profile\.roles\.includes\("TECHNICIAN"\)/);
  assert.match(assignmentScreen, /profilesApi\.list\([\s\S]*?role: "TECHNICIAN", status: "ACTIVE", q: technicianSearch \|\| undefined, page: technicianPage, size: TECHNICIAN_PAGE_SIZE/);
  assert.match(assignmentScreen, /<RepairWorkflowPagination[\s\S]*?techniciansQuery\.data\.totalPages/);
  assert.match(assignmentScreen, /machinesApi\.getMaintenanceTicketById\(ticketId, signal\)/);
});
