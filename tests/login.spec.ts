import { test, expect } from '@playwright/test';

test('Check connection between Frontend and Backend', async ({ page }) => {
  // 1. Visit the login page
  await page.goto('http://localhost:3000/login');

  // 2. Expect no 500 error, page should load properly with "Deer Coffee"
  await expect(page.locator('h1')).toContainText('Deer Coffee');

  // 3. Try to submit with an empty or fake credential to see if backend responds
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'wrongpassword');
  
  await page.click('button[type="submit"]');

  // 4. If backend is connected, we should see an error message from backend
  // Depending on what the backend returns for wrong credentials
  // Wait for the error message div to appear
  const errorMessage = page.locator('.bg-red-50');
  await errorMessage.waitFor({ state: 'visible', timeout: 5000 });
  
  // Verify that an error message from backend is shown
  await expect(errorMessage).toBeVisible();
});
