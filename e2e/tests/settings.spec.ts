import {
  HOME_TAGLINE,
  clickBack,
  clickLabel,
  createRoom,
  expect,
  test,
  waitForText,
} from "./helpers";

const nameField = (page: import("@playwright/test").Page) =>
  page.locator('input[aria-label="Your name"]').filter({ visible: true }).first();

test("the name you played under is filled in next time", async ({ newPlayer }) => {
  const host = await newPlayer("host");
  await createRoom(host, "Hannah");
  await clickBack(host);
  await waitForText(host, HOME_TAGLINE);

  await host.getByText("Create Game", { exact: true }).click();
  await expect(nameField(host)).toHaveValue("Hannah");
  await clickBack(host);
  await host.getByText("Join Game", { exact: true }).click();
  await expect(nameField(host)).toHaveValue("Hannah");

  // Still there after the app restarts
  await host.goto("/");
  await host.getByText("Join Game", { exact: true }).click();
  await expect(nameField(host)).toHaveValue("Hannah");
});

test("Settings turns sound off and remembers it", async ({ newPlayer }) => {
  const page = await newPlayer("player");
  const sound = page.locator('[role="switch"][aria-label="Sound"]').filter({ visible: true });

  await clickLabel(page, "Settings");
  await expect(sound).toHaveAttribute("aria-checked", "true");
  // Browsers can't vibrate, so there's no Vibration switch on the web
  await expect(page.locator('[role="switch"][aria-label="Vibration"]')).toHaveCount(0);
  await sound.click();
  await expect(sound).toHaveAttribute("aria-checked", "false");

  // The game screens' speaker button agrees
  await page.getByText("Done", { exact: true }).click();
  await page.getByText("Join Game", { exact: true }).click();
  await expect(page.locator('[aria-label="Turn sounds on"]').filter({ visible: true })).toHaveCount(
    1,
  );

  await page.goto("/");
  await clickLabel(page, "Settings");
  await expect(sound).toHaveAttribute("aria-checked", "false");
});
