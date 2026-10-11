import { test, expect, type Page } from "@playwright/test";
async function english(page: Page) {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
}
async function library(page: Page) {
  if (await page.locator(".mobile-menu").isVisible()) {
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page
      .locator(".mobile-actions")
      .getByRole("button", { name: "Open project", exact: true })
      .click();
  } else
    await page
      .getByRole("button", { name: "Open project", exact: true })
      .click();
}
async function demo(page: Page, name: string) {
  await library(page);
  await page.locator(".demo-card").filter({ hasText: name }).click();
  await expect(
    page.getByRole("textbox", { name: "Project name", exact: true }),
  ).toHaveValue(name);
}
async function run(page: Page) {
  await page
    .getByRole("button", { name: "Run simulation", exact: true })
    .click();
  await expect(
    page.locator(".result-panel").getByText("Calculated", { exact: true }),
  ).toBeVisible();
}
const floorPressure = (page: Page) =>
  page
    .locator(".result-panel tbody tr")
    .filter({ hasText: "FLOOR_2" })
    .locator("td")
    .nth(2);
test("real EPANET, PRV edits, pump closure, scenarios, persistence and bilingual UI", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await english(page);
  await demo(page, "Simple Fire Network");
  await run(page);
  const baseline = await floorPressure(page).innerText();
  await page.locator(".edge-badge").filter({ hasText: "PRV" }).click();
  await page.getByLabel(/^Set pressure/).fill("4");
  await expect(
    page.locator(".result-panel").getByText("Calculated", { exact: true }),
  ).toHaveCount(0);
  await run(page);
  expect(await floorPressure(page).innerText()).not.toBe(baseline);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Scenarios/ })
    .click();
  await expect(
    page.getByText("Compare scenarios", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".comparison-panel tbody tr").filter({ hasText: "FLOOR_2" }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Network", exact: true })
    .click();
  await page.locator(".edge-badge").filter({ hasText: "PUMP" }).click();
  await page
    .getByRole("combobox", { name: "Operating status", exact: true })
    .selectOption("closed");
  await page
    .getByRole("button", { name: "Run simulation", exact: true })
    .click();
  await expect(
    page.locator(".result-panel").getByText("Invalid", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.locator(".metric-card").first().locator("strong"),
  ).toContainText("—");
  if (await page.locator(".mobile-menu").isVisible()) {
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page
      .locator(".mobile-actions")
      .getByRole("button", { name: "Save", exact: true })
      .click();
  } else await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved locally");
  await page.reload();
  await page.locator(".edge-badge").filter({ hasText: "PUMP" }).click();
  await expect(
    page.getByRole("combobox", { name: "Operating status", exact: true }),
  ).toHaveValue("closed");
  await page.getByRole("button", { name: "التبديل إلى العربية" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(
    page.getByRole("button", { name: "تشغيل المحاكاة", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("parallel pump response and static/residual comparison", async ({
  page,
}) => {
  await english(page);
  await demo(page, "Parallel Fire Pumps");
  await run(page);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Scenarios/ })
    .click();
  await page
    .getByRole("button", { name: "Calculate static & residual", exact: true })
    .click();
  await expect(page.locator(".comparison-panel")).toContainText(
    "Static • matched inputs",
  );
  await expect(page.locator(".comparison-panel")).toContainText(
    "Residual • matched inputs",
  );
  await expect(
    page.locator(".comparison-panel").getByText("Calculated", { exact: false }),
  ).toHaveCount(2);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Network", exact: true })
    .click();
  await page.locator(".edge-badge").filter({ hasText: "PUMP" }).first().click();
  await page
    .getByRole("combobox", { name: "Operating status", exact: true })
    .selectOption("closed");
  await run(page);
  await expect(
    page.locator(".metric-card").first().locator("strong"),
  ).not.toContainText("—");
});
test("high-rise field readings, dashboard charts, JSON export and print report", async ({
  page,
}) => {
  await english(page);
  await demo(page, "High-Rise Building");
  await run(page);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Performance", exact: true })
    .click();
  await expect(page.locator(".charts-grid .recharts-wrapper")).toHaveCount(4);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Scenarios/ })
    .click();
  await expect(page.getByLabel("Field FLOOR_0")).toHaveValue("11.5");
  await expect(page.getByLabel("Field FLOOR_9")).toHaveValue("6.6");
  await page.getByLabel("Field FLOOR_9").fill("6.2");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Report", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hydraulic simulation report" }),
  ).toBeVisible();
  await expect(page.locator(".report-document")).toContainText(
    "OWA EPANET 2.2",
  );
  await expect(page.locator(".report-document")).toContainText(
    "not calibrated",
  );
  if (await page.locator(".mobile-menu").isVisible()) {
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page
        .locator(".mobile-actions")
        .getByRole("button", { name: "Export project JSON", exact: true })
        .click(),
    ]);
    expect(download.suggestedFilename()).toBe("High-Rise Building.json");
  } else {
    await page.locator(".export-menu summary").click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page
        .getByRole("button", { name: "Export project JSON", exact: true })
        .click(),
    ]);
    expect(download.suggestedFilename()).toBe("High-Rise Building.json");
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow).toBe(false);
});
test("editor adds, duplicates and undoes real elements", async ({ page }) => {
  await english(page);
  await demo(page, "Simple Fire Network");
  const before = await page.locator(".react-flow__node").count();
  await page
    .locator(".component-button")
    .filter({ hasText: "Demand point" })
    .click();
  await expect(page.locator(".react-flow__node")).toHaveCount(before + 1);
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(before + 2);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(before + 1);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(before + 2);
});
