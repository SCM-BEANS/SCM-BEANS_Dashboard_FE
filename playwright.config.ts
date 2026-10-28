import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    browserName: "chromium",
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    env: { NEXT_DIST_DIR: ".next-playwright" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
