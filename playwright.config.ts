import { defineConfig, devices } from '@playwright/test'

const normalUrl = 'http://127.0.0.1:3000'
const maintenanceUrl = 'http://127.0.0.1:3001'
// Local opt-in only: callers choosing reuse are responsible for these ports serving this build.
const reuseExistingServer = !process.env.CI && process.env.PLAYWRIGHT_REUSE_SERVER === '1'

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: { baseURL: normalUrl },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
  ],
  webServer: [
    {
      name: 'normal',
      command:
        'env MAINTENANCE_MODE=false npm run build && env MAINTENANCE_MODE=false npm run start -- -H 127.0.0.1 -p 3000',
      url: `${normalUrl}/api/health`,
      reuseExistingServer,
      timeout: 180_000,
    },
    {
      name: 'maintenance',
      // webServer entries start concurrently. Wait for the normal server so its build owns .next.
      command:
        'attempt=0; until curl --fail --silent --output /dev/null http://127.0.0.1:3000/api/health; do attempt=$((attempt + 1)); if [ "$attempt" -ge 190 ]; then exit 1; fi; sleep 1; done; exec env MAINTENANCE_MODE=true npm run start -- -H 127.0.0.1 -p 3001',
      url: `${maintenanceUrl}/api/health`,
      reuseExistingServer,
      timeout: 240_000,
    },
  ],
})
