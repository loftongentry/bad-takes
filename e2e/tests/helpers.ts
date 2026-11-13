import { test as base, type BrowserContext, type Page } from "@playwright/test";

// The web app keeps earlier screens in the page (hidden) after navigating, so these helpers
// always act on the *visible* match, and read the rendered text (innerText) rather than the DOM.

export const VOTE_UP = "Vote up: cheer";
export const HOME_TAGLINE = "Defend the indefensible.";

export const pageText = (page: Page) => page.evaluate(() => document.body.innerText);

// Case-insensitive: titles are uppercased by CSS, which innerText reflects
export async function waitForText(page: Page, text: string, timeout = 15_000) {
  await page.waitForFunction(
    (t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()),
    text,
    { timeout },
  );
}

export async function waitForPattern(page: Page, pattern: RegExp, timeout = 15_000) {
  await page.waitForFunction(
    ({ source, flags }) => new RegExp(source, flags).test(document.body.innerText),
    { source: pattern.source, flags: pattern.flags },
    { timeout },
  );
}

// Resolves to whether the text showed up in time (for checks that report rather than throw)
export const showsText = (page: Page, text: string, timeout?: number) =>
  waitForText(page, text, timeout).then(
    () => true,
    () => false,
  );

export async function clickText(page: Page, text: string) {
  await page.getByText(text, { exact: true }).filter({ visible: true }).first().click();
}

// Clicks the visible element with this accessibility label
export async function clickLabel(page: Page, label: string) {
  await page.locator(`[aria-label="${label}"]`).filter({ visible: true }).first().click();
}

// Focuses the visible matching field and types. Retries the focus: a field is hidden until its
// entrance animation starts, and can't take focus before then.
export async function typeInto(page: Page, selector: string, text: string) {
  await page.waitForFunction(
    (s) => {
      const el = [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.checkVisibility());
      if (!el) return false;
      el.focus();
      return document.activeElement === el;
    },
    selector,
    { timeout: 15_000, polling: 50 },
  );
  await page.keyboard.type(text);
}

// The lobby shows the code on tiles labelled "Room code XXXXX"
export async function readJoinCode(page: Page) {
  const tiles = page.locator('[aria-label^="Room code "]').filter({ visible: true }).first();
  const label = await tiles.getAttribute("aria-label", { timeout: 15_000 });
  return (label ?? "").slice("Room code ".length);
}

// The back arrow is the first visible button with no text
export async function clickBack(page: Page) {
  await page.evaluate(() => {
    const back = [...document.querySelectorAll<HTMLElement>('button, [role="button"]')].find(
      (b) => b.checkVisibility() && b.innerText.trim() === "",
    );
    back?.click();
  });
}

// The message in the notice on screen (failed actions, being sent home), or null if none shows
export async function waitForNotice(page: Page, timeout = 15_000) {
  const notice = page.locator('[role="alert"]').filter({ visible: true }).first();
  await notice.waitFor({ timeout });
  return notice.innerText();
}

export async function dismissNotice(page: Page) {
  await clickText(page, "OK");
}

export async function createRoom(host: Page, hostName: string, lobbyName = "UI Test") {
  await clickText(host, "Create Game");
  await typeInto(host, 'input[aria-label="Lobby name"]', lobbyName);
  await typeInto(host, 'input[aria-label="Your name"]', hostName);
  await clickText(host, "Create Lobby");
  return readJoinCode(host);
}

export async function joinRoom(guest: Page, code: string, name: string) {
  await clickText(guest, "Join Game");
  await typeInto(guest, 'input[autocapitalize="characters"]', code.toLowerCase());
  await typeInto(guest, 'input[aria-label="Your name"]', name);
  await clickText(guest, "Join Lobby");
  await waitForText(guest, `${name} (you)`);
}

type Fixtures = {
  // Error alerts and uncaught page errors from every player, for a final "no errors" check
  errors: string[];
  // Opens the app as a new player, in a browser context of its own (like a separate phone)
  newPlayer: (name: string) => Promise<Page>;
};

export const test = base.extend<Fixtures>({
  errors: async ({}, use) => {
    await use([]);
  },
  newPlayer: async ({ browser, errors }, use, testInfo) => {
    const players: { name: string; context: BrowserContext; page: Page }[] = [];
    await use(async (name) => {
      const context = await browser.newContext({
        baseURL: testInfo.project.use.baseURL,
        viewport: testInfo.project.use.viewport,
      });
      const page = await context.newPage();
      page.on("dialog", async (d) => {
        errors.push(`${name}: ${d.message()}`);
        await d.dismiss();
      });
      page.on("pageerror", (e) => errors.push(`${name} page error: ${e.message}`));
      await page.goto("/");
      players.push({ name, context, page });
      return page;
    });
    // On failure, attach what every player was looking at
    if (testInfo.status !== testInfo.expectedStatus) {
      for (const { name, page } of players) {
        const shot = await page.screenshot().catch(() => null);
        if (shot) await testInfo.attach(`${name}.png`, { body: shot, contentType: "image/png" });
      }
    }
    await Promise.all(players.map((p) => p.context.close()));
  },
});

export { expect } from "@playwright/test";
