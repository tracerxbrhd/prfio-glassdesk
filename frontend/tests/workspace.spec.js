import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function signIn(page, email = 'admin@example.com') {
  await page.goto('/');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Sign in to GlassDesk' }).click();
  await expect(page.getByRole('heading', { name: 'A clear view of your day.' })).toBeVisible();
}

test('session persists, invalid credentials fail, and logout protects routes', async ({ page }) => {
  await page.goto('/inbox');
  await page.getByLabel('Password', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Sign in to GlassDesk' }).click();
  await expect(page.getByRole('alert')).toContainText('Email or password is incorrect');
  await page.getByLabel('Password', { exact: true }).fill('demo-password');
  await page.getByRole('button', { name: 'Sign in to GlassDesk' }).click();
  await expect(page.getByRole('heading', { name: 'Your shared inbox.' })).toBeVisible();
  const cookies = await page.context().cookies();
  expect(cookies.find(cookie => cookie.name === 'glassdesk_sessionid')?.httpOnly).toBe(true);
  expect(cookies.some(cookie => cookie.name === 'glassdesk_csrftoken')).toBe(true);
  expect(cookies.some(cookie => cookie.name === 'sessionid')).toBe(false);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your shared inbox.' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
  await page.goto('/inbox/1');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('ticket lifecycle persists replies, notes, status, priority, tags, edits and deletion', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: 'New ticket' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Subject', { exact: true }).fill('Browser verification conversation');
  await dialog.getByRole('combobox', { name: 'Customer', exact: true }).selectOption({ label: 'Olivia Chen · Luma Labs' });
  await dialog.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('high');
  await dialog.getByRole('combobox', { name: 'Assign to', exact: true }).selectOption({ label: 'Mia Thompson' });
  await dialog.getByLabel('Opening message').fill('Please help us verify a persistent support conversation.');
  await dialog.getByLabel('Billing', { exact: true }).check();
  await dialog.getByRole('button', { name: 'Create ticket' }).click();
  await expect(page.getByRole('heading', { name: 'Browser verification conversation' })).toBeVisible();
  await page.getByLabel('Reply message', { exact: true }).fill('Your account is ready. This reply should survive a reload.');
  await page.getByRole('button', { name: 'Add reply', exact: true }).click();
  await expect(page.locator('.message-body').last()).toContainText('Your account is ready.');
  await page.getByRole('button', { name: 'Internal note', exact: true }).click();
  await page.getByLabel('Internal note', { exact: true }).fill('Follow up with the billing team tomorrow.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.locator('.message-note')).toContainText('Follow up with the billing team tomorrow.');
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('resolved');
  await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toBeEnabled();
  await page.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('urgent');
  await expect(page.getByRole('combobox', { name: 'Priority', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Edit ticket' }).click();
  await dialog.getByLabel('Subject', { exact: true }).fill('Verified support conversation');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Verified support conversation' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toHaveValue('resolved');
  await expect(page.getByRole('combobox', { name: 'Priority', exact: true })).toHaveValue('urgent');
  await expect(page.locator('.message-note')).toContainText('Follow up with the billing team tomorrow.');
  await page.getByRole('button', { name: 'Delete ticket', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page.getByRole('heading', { name: 'Your shared inbox.' })).toBeVisible();
  await page.getByLabel('Search tickets').fill('Verified support conversation');
  await expect(page.getByRole('heading', { name: 'A little breathing room.' })).toBeVisible();
});

test('customer and category management, filtering and team access', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Customers', exact: true }).click();
  await page.getByRole('button', { name: 'Add customer', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill('Robin Browser');
  await dialog.getByLabel('Email address').fill('robin.browser@example.com');
  await dialog.getByLabel('Company').fill('Verification Studio');
  await dialog.getByRole('button', { name: 'Save customer' }).click();
  await page.getByRole('button', { name: /Robin Browser/ }).click();
  await page.locator('.customer-history').getByRole('button', { name: 'Edit', exact: true }).click();
  await dialog.getByLabel('Company').fill('Verified Studio');
  await dialog.getByRole('button', { name: 'Save customer' }).click();
  await expect(page.locator('.customer-history h2')).toContainText('Verified Studio');
  await page.getByRole('button', { name: 'Delete customer' }).click();
  await dialog.getByRole('button', { name: 'Remove customer', exact: true }).click();
  await expect(page.getByRole('button', { name: /Robin Browser/ })).toHaveCount(0);
  await page.getByRole('link', { name: 'Tags & categories' }).click();
  await page.getByRole('button', { name: 'Create tag', exact: true }).click();
  await dialog.getByLabel('Tag name').fill('Browser check');
  await dialog.getByRole('button', { name: 'Save tag' }).click();
  await page.getByRole('button', { name: 'Edit Browser check' }).click();
  await dialog.getByLabel('Tag name').fill('Verified category');
  await dialog.getByRole('button', { name: 'Save tag' }).click();
  await page.getByRole('button', { name: 'Delete Verified category' }).click();
  await dialog.getByRole('button', { name: 'Remove tag', exact: true }).click();
  await expect(page.getByText('Verified category', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Support team' }).click();
  await page.getByRole('button', { name: 'Edit Mia Thompson' }).click();
  await dialog.getByLabel('Last name').fill('Thompson-QA');
  await dialog.getByRole('button', { name: 'Save team member' }).click();
  await page.getByRole('button', { name: 'Edit Mia Thompson-QA' }).click();
  await dialog.getByLabel('Last name').fill('Thompson');
  await dialog.getByRole('button', { name: 'Save team member' }).click();
  await expect(page.getByRole('heading', { name: 'Mia Thompson', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /^Inbox/ }).click();
  await page.getByLabel('Filter status').selectOption('waiting');
  await page.getByLabel('Filter priority').selectOption('urgent');
  await expect(page.locator('.ticket-row')).toHaveCount(1);
  await expect(page.locator('.ticket-row')).toContainText('SSO sign-in');
});

test('support agent cannot see administrator management controls', async ({ page }) => {
  await signIn(page, 'mia@example.com');
  await page.getByRole('link', { name: 'Customers', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your customers.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add customer' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Support team' }).click();
  await expect(page.getByRole('button', { name: 'Add agent' })).toHaveCount(0);
  await page.goto('/inbox/1');
  await expect(page.getByRole('button', { name: 'Edit ticket' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete ticket', exact: true })).toHaveCount(0);
});

for (const width of [360, 768, 1440, 1920]) {
  test(`responsive workspace, accessible controls and screenshots at ${width}px`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 360 ? 800 : 1080 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    await page.screenshot({ path: `../docs/screenshots/login-${width}.png`, fullPage: true });
    await signIn(page);
    for (const [path, name, heading] of [
      ['/', 'dashboard', 'A clear view of your day.'],
      ['/inbox', 'inbox', 'Your shared inbox.'],
      ['/inbox/1', 'ticket', "Workspace members can't access shared projects"],
      ['/customers', 'customers', 'Your customers.'],
      ['/analytics', 'analytics', 'The story behind the numbers.'],
      ['/team', 'team', 'A team that cares.'],
      ['/tags', 'tags', 'Small labels. Clear context.'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} should fit ${width}px`).toBe(true);
      expect(await page.locator('button, input, select, textarea').evaluateAll(elements => elements.filter(element => {
        if (!element.checkVisibility()) return false;
        return !element.getAttribute('aria-label') && !element.labels?.length && !element.textContent.trim();
      }).length), `${name} controls need labels`).toBe(0);
      if (['dashboard', 'inbox', 'ticket'].includes(name) || width === 1440) {
        await page.screenshot({ path: `../docs/screenshots/${name}-${width}.png`, fullPage: name !== 'inbox' });
      }
    }
    expect(errors).toEqual([]);
  });
}

for (const width of [360, 1440]) {
  test(`WCAG A/AA checks on login and all workspace routes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1080 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    async function audit() {
      await page.evaluate(() => document.fonts.ready);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]);
    }
    await audit();
    await signIn(page);
    for (const path of ['/', '/inbox', '/inbox/1', '/customers', '/analytics', '/team', '/tags']) {
      await page.goto(path);
      await expect(page.locator('.page-heading, .detail-heading')).toBeVisible();
      await audit();
    }
    await page.goto('/');
    await page.getByRole('button', { name: 'New ticket' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await audit();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
}

test('a failed workspace request has a working retry', async ({ page }) => {
  let fail = true;
  await page.route('**/api/dashboard/', route => fail
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'The workspace is temporarily unavailable.' }) })
    : route.continue());
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in to GlassDesk' }).click();
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
  fail = false;
  await page.getByRole('button', { name: 'Retry connection' }).click();
  await expect(page.getByRole('heading', { name: 'A clear view of your day.' })).toBeVisible();
});

