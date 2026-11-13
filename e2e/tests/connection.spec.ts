import {
  HOME_TAGLINE,
  clickText,
  createRoom,
  expect,
  joinRoom,
  pageText,
  test,
  typeInto,
  waitForPattern,
  waitForText,
} from "./helpers";

test("a failed room request doesn't throw a player out of the lobby", async ({
  newPlayer,
  errors,
}) => {
  // Every room query from the guest fails, as on a flaky connection. The guest must not be
  // treated as having left: they stay in the lobby and the server keeps them in the room.
  const host = await newPlayer("host");
  const guest = await newPlayer("guest");
  let failRoomQueries = true;
  await guest.route("**/graphql", (route) => {
    const request = route.request();
    if (
      failRoomQueries &&
      request.method() === "POST" &&
      (request.postData() ?? "").includes("GetRoom")
    ) {
      return route.abort();
    }
    return route.continue();
  });

  const code = await createRoom(host, "Hannah");
  await clickText(guest, "Join Game");
  await typeInto(guest, 'input[autocapitalize="characters"]', code);
  await typeInto(guest, 'input[aria-label="Your name"]', "Gus");
  await clickText(guest, "Join Lobby");
  await guest.waitForTimeout(3_000);

  expect(await pageText(guest), "the guest is not sent home").not.toContain(HOME_TAGLINE);
  expect(await pageText(host), "the host still sees the guest in the room").toContain("Gus");

  failRoomQueries = false;
  await clickText(host, "Start Game");
  await test.step("the guest still follows the game once requests work again", async () => {
    await waitForText(guest, "Enter Bad Take", 10_000);
  });
  const unexpected = errors.filter((e) => !e.includes("Failed to fetch"));
  expect(unexpected, "no unexpected errors").toEqual([]);
});

test("a player who misses an update while offline catches up on reconnecting", async ({
  newPlayer,
  errors,
}) => {
  // The guest's live connection drops (like a phone locking) right before voting opens, so the
  // guest misses that update. Once it reconnects, the guest must catch up to the voting screen.
  const host = await newPlayer("host");
  const guest = await newPlayer("guest");

  // Wrap the guest's WebSocket so the test can cut it and refuse reconnects for a while
  await guest.addInitScript(() => {
    const w = window as unknown as {
      WebSocket: typeof WebSocket;
      __sockets: WebSocket[];
      __offline: boolean;
    };
    const Real = w.WebSocket;
    w.__sockets = [];
    w.__offline = false;
    w.WebSocket = class extends Real {
      constructor(...args: ConstructorParameters<typeof WebSocket>) {
        super(...args);
        w.__sockets.push(this);
        if (w.__offline) setTimeout(() => this.close(4999, "test: offline"), 0);
      }
    };
  });
  await guest.reload();

  const code = await createRoom(host, "Hannah");
  await joinRoom(guest, code, "Gus");
  await waitForText(host, "Gus");
  await clickText(host, "Start Game");
  await typeInto(host, "textarea", "Pineapple belongs on pizza");
  await waitForText(guest, "Enter Bad Take");
  await typeInto(guest, "textarea", "Mondays are the best day");
  await clickText(host, "Submit Bad Take");
  await clickText(guest, "Submit Bad Take");
  await waitForPattern(host, /DEFEND THIS!|Listen Up!/i);
  const defender = /DEFEND THIS!/i.test(await pageText(host)) ? host : guest;

  // Drop the guest's connection, then open voting while it's down
  await guest.evaluate(() => {
    const w = window as unknown as { __sockets: WebSocket[]; __offline: boolean };
    w.__offline = true;
    w.__sockets.forEach((s) => {
      if (s.readyState <= 1) s.close(4999, "test: offline");
    });
  });
  await guest.waitForTimeout(1_000);
  await clickText(defender, "End Defense"); // a normal HTTP request, still works
  await guest.waitForTimeout(2_500);
  expect(await pageText(guest), "while offline, the guest has not seen voting open").not.toMatch(
    /Cast Your Vote|jury is deciding/i,
  );

  // Back online: the guest must catch up without any further game events
  await guest.evaluate(() => {
    (window as unknown as { __offline: boolean }).__offline = false;
  });
  await test.step("after reconnecting, the guest catches up to the voting screen", async () => {
    await waitForPattern(guest, /Cast Your Vote|jury is deciding/i);
  });
  expect(errors, "no error alerts or page errors").toEqual([]);
});
