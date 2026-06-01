// safora_contact_form.spec.js
// Playwright automation for Safora "Get In Touch" Contact Form
// URL: https://safora.se/en/contact.html
//
// Setup Instructions:
//   1. npm init -y
//   2. npm install -D @playwright/test
//   3. npx playwright install chromium
//   4. npx playwright test safora_contact_form.spec.js --headed
//
// Note: reCAPTCHA is present on this form. In a real environment,
// use a test/bypass key or mock it. The tests here verify all
// fields and form behavior excluding reCAPTCHA submission.

const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://safora.se/en/contact.html';

const TEST_DATA = {
  validName: 'John Doe',
  validEmail: 'johndoe@example.com',
  validPhone: '+1 555 123 4567',
  validMessage: 'I am interested in learning more about Safora for our organization.',
  invalidEmail: 'not-an-email',
  longMessage: 'A'.repeat(500),
};

// ─── Helper ─────────────────────────────────────────────────────────────────

async function navigateToContact(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[placeholder="Your Name"]', { timeout: 10000 });
}

async function fillForm(page, { name, email, phone, message }) {
  if (name !== undefined)    await page.fill('input[placeholder="Your Name"]', name);
  if (email !== undefined)   await page.fill('input[placeholder="Email Address"]', email);
  if (phone !== undefined)   await page.fill('input[placeholder="Phone Number"]', phone);
  if (message !== undefined) await page.fill('textarea[placeholder="Your Message"]', message);
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

test.describe('Safora Contact Us Form', () => {

  // ── 1. Page Load & Visibility ────────────────────────────────────────────

  test('TC01 - Page loads and heading is visible', async ({ page }) => {
    await navigateToContact(page);

    await expect(page).toHaveTitle(/Safora/i);
    await expect(page.locator('h2, h3').filter({ hasText: 'Get In Touch' })).toBeVisible();
    await expect(page.locator('text=Speak with a SAFORA specialist')).toBeVisible();
  });

  test('TC02 - All form fields are visible', async ({ page }) => {
    await navigateToContact(page);

    await expect(page.locator('input[placeholder="Your Name"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Email Address"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Phone Number"]')).toBeVisible();
    await expect(page.locator('textarea[placeholder="Your Message"]')).toBeVisible();
  });

  test('TC03 - reCAPTCHA widget is present', async ({ page }) => {
    await navigateToContact(page);

    // Check the reCAPTCHA iframe or container exists
    const recaptcha = page.locator('.g-recaptcha, iframe[src*="recaptcha"], #rc-anchor-container');
    await expect(recaptcha.first()).toBeVisible({ timeout: 8000 });
  });

  test('TC04 - Send Message button is visible', async ({ page }) => {
    await navigateToContact(page);

    const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Send Message")');
    await expect(submitBtn.first()).toBeVisible();
  });

  // ── 2. Field Input ────────────────────────────────────────────────────────

  test('TC05 - User can type in all fields', async ({ page }) => {
    await navigateToContact(page);

    await fillForm(page, {
      name: TEST_DATA.validName,
      email: TEST_DATA.validEmail,
      phone: TEST_DATA.validPhone,
      message: TEST_DATA.validMessage,
    });

    await expect(page.locator('input[placeholder="Your Name"]')).toHaveValue(TEST_DATA.validName);
    await expect(page.locator('input[placeholder="Email Address"]')).toHaveValue(TEST_DATA.validEmail);
    await expect(page.locator('input[placeholder="Phone Number"]')).toHaveValue(TEST_DATA.validPhone);
    await expect(page.locator('textarea[placeholder="Your Message"]')).toHaveValue(TEST_DATA.validMessage);
  });

  test('TC06 - Name field accepts special characters', async ({ page }) => {
    await navigateToContact(page);

    const specialName = "O'Brien & Müller";
    await page.fill('input[placeholder="Your Name"]', specialName);
    await expect(page.locator('input[placeholder="Your Name"]')).toHaveValue(specialName);
  });

  test('TC07 - Message textarea accepts long input', async ({ page }) => {
    await navigateToContact(page);

    await page.fill('textarea[placeholder="Your Message"]', TEST_DATA.longMessage);
    const value = await page.locator('textarea[placeholder="Your Message"]').inputValue();
    expect(value.length).toBeGreaterThanOrEqual(500);
  });

  test('TC08 - Fields can be cleared after typing', async ({ page }) => {
    await navigateToContact(page);

    await page.fill('input[placeholder="Your Name"]', TEST_DATA.validName);
    await page.fill('input[placeholder="Your Name"]', '');
    await expect(page.locator('input[placeholder="Your Name"]')).toHaveValue('');
  });

  // ── 3. Validation ─────────────────────────────────────────────────────────

  test('TC09 - Submit with all fields empty shows validation errors', async ({ page }) => {
    await navigateToContact(page);

    const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Send Message")');
    await submitBtn.first().click();

    // Expect the page NOT to navigate away (form blocked by validation)
    await expect(page).toHaveURL(BASE_URL);

    // Check HTML5 required validation or custom error messages
    const nameField = page.locator('input[placeholder="Your Name"]');
    const emailField = page.locator('input[placeholder="Email Address"]');
    const isNameInvalid = await nameField.evaluate(el => !el.validity.valid);
    const isEmailInvalid = await emailField.evaluate(el => !el.validity.valid);
    expect(isNameInvalid || isEmailInvalid).toBeTruthy();
  });

  test('TC10 - Submit with only name filled still fails validation', async ({ page }) => {
    await navigateToContact(page);

    await page.fill('input[placeholder="Your Name"]', TEST_DATA.validName);
    const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Send Message")');
    await submitBtn.first().click();

    await expect(page).toHaveURL(BASE_URL);
  });

  test('TC11 - Invalid email format is flagged', async ({ page }) => {
    await navigateToContact(page);

    await fillForm(page, {
      name: TEST_DATA.validName,
      email: TEST_DATA.invalidEmail,
      phone: TEST_DATA.validPhone,
      message: TEST_DATA.validMessage,
    });

    const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Send Message")');
    await submitBtn.first().click();

    const emailField = page.locator('input[placeholder="Email Address"]');
    const isInvalid = await emailField.evaluate(el => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('TC12 - Phone number field accepts numeric and formatted input', async ({ page }) => {
    await navigateToContact(page);

    await page.fill('input[placeholder="Phone Number"]', '+46 73 044 58 55');
    await expect(page.locator('input[placeholder="Phone Number"]')).toHaveValue('+46 73 044 58 55');
  });

  // ── 4. Navigation & UI ────────────────────────────────────────────────────

  test('TC13 - Navigation bar links are visible and clickable', async ({ page }) => {
    await navigateToContact(page);

    await expect(page.locator('a:has-text("Home")')).toBeVisible();
    await expect(page.locator('a:has-text("About Us")')).toBeVisible();
    await expect(page.locator('a:has-text("Contact Us")')).toBeVisible();
  });

  test('TC14 - Book A Demo button is visible in navbar', async ({ page }) => {
    await navigateToContact(page);

    await expect(page.locator('a:has-text("Book a Demo"), a:has-text("Book A Demo")')).toBeVisible();
  });

  test('TC15 - Language toggle EN/SV is visible', async ({ page }) => {
    await navigateToContact(page);

    await expect(page.locator('a:has-text("EN"), button:has-text("EN"), span:has-text("EN")')).toBeVisible();
    await expect(page.locator('a:has-text("SV"), button:has-text("SV"), span:has-text("SV")')).toBeVisible();
  });

  test('TC16 - Switching to SV language navigates to Swedish page', async ({ page }) => {
    await navigateToContact(page);

    await page.click('a[href*="/sv/"]');
    await expect(page).toHaveURL(/\/sv\//);
  });

  // ── 5. Responsiveness ─────────────────────────────────────────────────────

  test('TC17 - Form is visible on mobile viewport (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await navigateToContact(page);

    await expect(page.locator('input[placeholder="Your Name"]')).toBeVisible();
    await expect(page.locator('textarea[placeholder="Your Message"]')).toBeVisible();
  });

  test('TC18 - Form is visible on tablet viewport (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await navigateToContact(page);

    await expect(page.locator('input[placeholder="Email Address"]')).toBeVisible();
  });

  // ── 6. Accessibility ──────────────────────────────────────────────────────

  test('TC19 - Form fields are focusable via keyboard Tab', async ({ page }) => {
    await navigateToContact(page);

    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement.tagName.toLowerCase());
    expect(['input', 'textarea', 'button', 'a']).toContain(focusedTag);
  });

  test('TC20 - Page has a proper title tag', async ({ page }) => {
    await navigateToContact(page);
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title).toMatch(/Safora/i);
  });

});
