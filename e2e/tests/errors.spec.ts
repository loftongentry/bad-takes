import {
  HOME_TAGLINE,
  clickText,
  createRoom,
  dismissNotice,
  expect,
  joinRoom,
  pageText,
  test,
  typeInto,
  waitForNotice,
  waitForPattern,
  waitForText,
} from "./helpers";

async function tryToJoin(page: Parameters<typeof joinRoom>[0], code: string, name: string) {
  await clickText(page, "Join Game");
  await typeInto(page, 'input[autocapitalize="characters"]', code);
  await typeInto(page, 'input[aria-label="Your name"]', name);
  await clickText(page, "Join Lobby");
}

test("joining with a wrong code or too late says why", async ({ newPlayer }) => {
  const host = await newPlayer("host");
  const gus = await newPlayer("gus");
  const late = await newPlayer("late");

  await tryToJoin(late, "ZZZZZ", "Lou");
  expect(await waitForNotice(late)).toContain("There's no game with that code");
  await dismissNotice(late);
  expect(await pageText(late), "still on the Join screen").toMatch(/join lobby/i);

  const code = await createRoom(host, "Hannah");
  await joinRoom(gus, code, "Gus");
  await clickText(host, "Start Game");
  await waitForText(host, "Enter Bad Take");

  await late.reload(); // back to a fresh Join screen
  await tryToJoin(late, code, "Lou");
  expect(await waitForNotice(late)).toContain("That game has already started");
});

test("starting a game whose room has closed sends the host home with a reason", async ({
  newPlayer,
}) => {
  const host = await newPlayer("host");
  const guest = await newPlayer("guest");
  const code = await createRoom(host, "Hannah");
  await joinRoom(guest, code, "Gus");
  await waitForText(host, "Gus");

  // The room expires while the lobby sits idle: the server's answer to Start is that it's gone
  await host.route("**/graphql", async (route) => {
    if ((route.request().postData() ?? "").includes("mutation Start(")) {
      return route.fulfill({
        json: {
          errors: [
            {
              message:
                "This game has ended: the host left, or the room closed after an hour with nothing happening.",
              extensions: { code: "ROOM_CLOSED" },
            },
          ],
        },
      });
    }
    return route.continue();
  });
  await clickText(host, "Start Game");
  await waitForText(host, HOME_TAGLINE);
  expect(await waitForNotice(host)).toContain("an hour with nothing happening");
});

test("a failed End Defense tap says so, and the defense still ends on its own", async ({
  newPlayer,
  errors,
}) => {
  const host = await newPlayer("host");
  const guest = await newPlayer("guest");
  const code = await createRoom(host, "Hannah");
  await joinRoom(guest, code, "Gus");
  await clickText(host, "Start Game");
  for (const page of [host, guest]) {
    await typeInto(page, "textarea", "Pineapple belongs on pizza");
    await clickText(page, "Submit Bad Take");
  }
  await waitForPattern(host, /DEFEND THIS!|Listen Up!/i);
  const defender = /DEFEND THIS!/i.test(await pageText(host)) ? host : guest;

  // The defender's connection fails just as they tap End Defense
  await defender.route("**/graphql", (route) =>
    (route.request().postData() ?? "").includes("EndTurn") ? route.abort() : route.continue(),
  );
  await clickText(defender, "End Defense");
  const message = await waitForNotice(defender);
  expect(message).toContain("Couldn't reach the game");
  expect(message).toContain("ends on its own");
  expect(await pageText(defender), "still defending").toMatch(/DEFEND THIS!/i);

  // With the connection back, tapping again works
  await defender.unroute("**/graphql");
  await dismissNotice(defender);
  await clickText(defender, "End Defense");
  await waitForText(defender, "The jury is deciding");
  expect(errors.filter((e) => !e.includes("Failed to fetch"))).toEqual([]);
});

test("Create says so when it can't load the game's rules, and Try Again recovers", async ({
  newPlayer,
}) => {
  const page = await newPlayer("host");
  let failRules = true;
  await page.route("**/graphql", (route) =>
    failRules && (route.request().postData() ?? "").includes("GetRules")
      ? route.abort()
      : route.continue(),
  );
  await page.reload();
  await clickText(page, "Create Game");
  await waitForText(page, "Couldn't reach the game");

  failRules = false;
  await clickText(page, "Try Again");
  await page.locator('input[aria-label="Lobby name"]').filter({ visible: true }).waitFor();
});
