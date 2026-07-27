import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("should display the page title", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Next.js Testing Demo" })
    ).toBeVisible();
  });

  test("should display the description text", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("Proyecto con pruebas unitarias")
    ).toBeVisible();
  });

  test("should display the Next.js logo", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByAltText("Next.js logo")).toBeVisible();
  });
});

test.describe("Counter component", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display initial count of 0", async ({ page }) => {
    const count = page.getByTestId("count");
    await expect(count).toHaveText("0");
  });

  test("should increment count when +1 button is clicked", async ({
    page,
  }) => {
    await page.getByTestId("increment").click();
    await expect(page.getByTestId("count")).toHaveText("1");
  });

  test("should decrement count when -1 button is clicked", async ({
    page,
  }) => {
    await page.getByTestId("decrement").click();
    await expect(page.getByTestId("count")).toHaveText("-1");
  });

  test("should reset count to 0 when reset button is clicked", async ({
    page,
  }) => {
    await page.getByTestId("increment").click();
    await page.getByTestId("increment").click();
    await page.getByTestId("increment").click();
    await expect(page.getByTestId("count")).toHaveText("3");

    await page.getByTestId("reset").click();
    await expect(page.getByTestId("count")).toHaveText("0");
  });

  test("should handle multiple increments", async ({ page }) => {
    await page.getByTestId("increment").click();
    await page.getByTestId("increment").click();
    await page.getByTestId("increment").click();
    await expect(page.getByTestId("count")).toHaveText("3");
  });

  test("should handle mixed operations", async ({ page }) => {
    await page.getByTestId("increment").click();
    await page.getByTestId("increment").click();
    await page.getByTestId("decrement").click();
    await expect(page.getByTestId("count")).toHaveText("1");
  });

  test("should handle negative counts", async ({ page }) => {
    await page.getByTestId("decrement").click();
    await page.getByTestId("decrement").click();
    await expect(page.getByTestId("count")).toHaveText("-2");
  });
});
