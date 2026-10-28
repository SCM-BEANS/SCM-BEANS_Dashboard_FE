# Landing page E2E

Install the project dependencies, install the Chromium browser once, then run the landing checks:

    npm.cmd install
    npx.cmd playwright install chromium
    npm.cmd run test:e2e -- --project=chromium

Playwright starts the Next.js development server on 127.0.0.1:3100 and uses .next-playwright as its build directory. This lets the E2E server run alongside the normal local app on port 3000.
