import { test, expect, type Page } from "@playwright/test";

const totals = { requests: 3, successfulRequests: 1, failedRequests: 1, pendingRequests: 1, slides: 2, reviews: 2, completedReviews: 1, partialReviews: 1, inputTokens: 100, outputTokens: 20, cachedInputTokens: 10, costUsd: .01, unknownUsageRequests: 1, unknownCostRequests: 1 };
const teacher = { id: "teacher-test", name: "Test Teacher", expiresAt: 2000000000000, dailyLimit: 20, generation: 1, revoked: false, createdAt: 1700000000000 };
async function mockAdmin(page: Page, signedIn = true) {
  let authorized = signedIn;
  let invites: (typeof teacher & { email?: string })[] = [teacher];
  const writes: { path: string; body: Record<string, unknown>; csrf?: string }[] = [];
  await page.route("**/api/admin/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/admin/", "");
    const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (request.method() === "POST") writes.push({ path, body: request.postDataJSON(), csrf: request.headers()["x-slideready-admin"] });
    if (path === "login") { authorized = true; return reply({ ok: true }); }
    if (!authorized) return reply({ error: "unauthorized" }, 401);
    if (path === "session") return reply({ ok: true });
    if (path === "logout") { authorized = false; return reply({ ok: true }); }
    if (path === "emails") {
      const email = request.postDataJSON().email as string;
      const invite = { ...teacher, id: "email-teacher", name: "Separate label", email };
      invites = [...invites, invite];
      return reply({ invite });
    }
    if (path === "invites" && request.method() === "POST") {
      const invite = { ...teacher, id: "new-teacher", ...request.postDataJSON() };
      invites = [...invites, invite];
      return reply({ invite, link: "http://127.0.0.1:3100/#invite=synthetic-private-link" });
    }
    if (path === "invites") return reply({ invites });
    if (path.endsWith("/revoke")) { invites = invites.map(invite => ({ ...invite, revoked: true })); return reply({ ok: true }); }
    if (path.endsWith("/restore")) { invites = invites.map(invite => ({ ...invite, revoked: false })); return reply({ ok: true }); }
    if (path.endsWith("/delete")) { invites = []; return reply({ ok: true }); }
    if (path === "usage") return reply({ daily: [{ date: "2026-10-14", ...totals }], perInvite: [], totals });
    return reply({ ok: true });
  });
  return { writes, expire: () => { authorized = false; } };
}

test("admin login keeps secrets out of storage and shows zero-use invites", async ({ page }) => {
  const mock = await mockAdmin(page, false);
  await page.goto("/admin");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-owner-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Test Teacher", exact: true })).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: "Test Teacher" });
  await expect(row).toContainText("Never");
  await expect(row.getByRole("cell").last()).toHaveText("0");
  await expect(page.locator(".admin-metrics > div").filter({ has: page.getByText("Reviews completed", { exact: true }) }).locator("dd")).toHaveText("1");
  expect(mock.writes[0].csrf).toBe("1");
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain("synthetic-owner-password");
  await page.screenshot({ path: "test-results/admin-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Owner sign in" })).toBeVisible();
  await expect(page.getByText("Test Teacher", { exact: true })).toHaveCount(0);
});

test("new invite link is shown once and uses request quota units", async ({ page }) => {
  const mock = await mockAdmin(page);
  await page.goto("/admin");
  await page.getByRole("button", { name: "Create invite", exact: true }).click();
  await page.getByLabel("Teacher name", { exact: true }).fill("New Teacher");
  await expect(page.getByText(/One review can use several requests/)).toBeVisible();
  await page.getByRole("button", { name: "Save invite", exact: true }).click();
  await expect(page.getByLabel("Invite link", { exact: true })).toHaveValue(/synthetic-private-link/);
  await expect(page.getByLabel("Invite link", { exact: true })).toBeFocused();
  const create = mock.writes.find(write => write.path === "invites");
  expect(create?.body.dailyLimit).toBe(20);
  expect(create?.csrf).toBe("1");
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain("synthetic-private-link");
  await page.getByRole("button", { name: "Dismiss link", exact: true }).click();
  await expect(page.getByLabel("Invite link", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "New Teacher", exact: true })).toBeVisible();
  await expect(page.getByLabel("Invite link", { exact: true })).toHaveCount(0);
});

test("destructive actions need confirmation and expired sessions clear private data", async ({ page }) => {
  const mock = await mockAdmin(page);
  await page.goto("/admin");
  await page.getByRole("button", { name: "Test Teacher", exact: true }).click();
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("button", { name: "Revoke access", exact: true }).click();
  expect(mock.writes).toHaveLength(0);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Revoke access", exact: true }).click();
  await expect(page.getByRole("button", { name: "Restore access", exact: true })).toBeVisible();
  expect(mock.writes[0].csrf).toBe("1");
  await expect(page.getByRole("button", { name: "Refresh", exact: true })).toBeEnabled();
  mock.expire();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Owner sign in" })).toBeVisible();
  await expect(page.getByText("Test Teacher", { exact: true })).toHaveCount(0);
});

test("owner can approve an email and restore its access without a link", async ({ page }) => {
  const mock = await mockAdmin(page);
  await page.goto("/admin");
  await page.getByLabel("School email", { exact: true }).fill("teacher.alpha@sendelta.com");
  await page.getByRole("button", { name: "Approve email", exact: true }).click();
  await expect(page.getByRole("button", { name: "teacher.alpha@sendelta.com", exact: true })).toBeVisible();
  await expect(page.getByLabel("Invite link", { exact: true })).toHaveCount(0);
  expect(mock.writes.find(write => write.path === "emails")).toMatchObject({ body: { email: "teacher.alpha@sendelta.com" }, csrf: "1" });
  await page.getByRole("button", { name: "teacher.alpha@sendelta.com", exact: true }).click();
  await expect(page.getByRole("heading", { name: "teacher.alpha@sendelta.com", exact: true })).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Revoke access", exact: true }).click();
  await expect(page.getByRole("button", { name: "Restore access", exact: true })).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Restore access", exact: true }).click();
  await expect(page.getByRole("button", { name: "Revoke access", exact: true })).toBeEnabled();
  expect(mock.writes.some(write => write.path === "invites/email-teacher/restore")).toBe(true);
  await expect(page.getByText(/An entered email does not verify/)).toBeVisible();
});

test("admin mobile layout supports Chinese and weekly activity", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAdmin(page);
  await page.goto("/admin");
  await page.getByRole("combobox", { name: "Group activity", exact: true }).selectOption("weekly");
  await expect(page.getByRole("rowheader", { name: "2026-10-12", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByText("Scroll the tables sideways to see all columns.")).toBeVisible();
  const table = page.getByRole("region", { name: "Invite activity table", exact: true });
  await table.focus(); await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  await page.getByTestId("language").selectOption("zh-Hans");
  await expect(page.getByRole("heading", { name: "教师邀请", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "创建邀请", exact: true })).toBeVisible();
  await expect(page.getByText("费用未知请求", { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: "test-results/admin-mobile-zh.png", fullPage: true });
});


