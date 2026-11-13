import {
  HOME_TAGLINE,
  clickBack,
  clickText,
  createRoom,
  expect,
  joinRoom,
  pageText,
  test,
  typeInto,
  waitForText,
} from "./helpers";

test("a player whose page reloads stays in the game", async ({ newPlayer, errors }) => {
  const host = await newPlayer("host");
  const guest = await newPlayer("guest");
  const code = await createRoom(host, "Hannah");
  await joinRoom(guest, code, "Gus");

  await test.step("reloading in the lobby keeps the player in it", async () => {
    await guest.reload();
    await waitForText(guest, "Gus (you)");
    await waitForText(host, "Gus");
  });

  await test.step("reloading while writing keeps the player in the game", async () => {
    await clickText(host, "Start Game");
    await waitForText(guest, "Enter Bad Take");
    await guest.reload();
    await waitForText(guest, "Enter Bad Take");
    await typeInto(guest, "textarea", "Mondays are the best day");
    await clickText(guest, "Submit Bad Take");
    await waitForText(guest, "Waiting on 1 player");
  });

  expect(errors, "no error alerts or page errors").toEqual([]);
});

test("reopening the app goes straight back into the game", async ({ newPlayer, errors }) => {
  const host = await newPlayer("host");
  const guest = await newPlayer("guest");
  const code = await createRoom(host, "Hannah");
  await joinRoom(guest, code, "Gus");
  await clickText(host, "Start Game");
  await waitForText(guest, "Enter Bad Take");

  // Like closing the app and opening it again: it starts on Home, with the saved session
  await guest.goto("/");
  await waitForText(guest, "Enter Bad Take");
  expect(await pageText(guest), "Home is skipped").not.toContain(HOME_TAGLINE);

  await test.step("leaving afterwards still goes home, and stays there", async () => {
    await clickBack(guest);
    await waitForText(guest, HOME_TAGLINE);
    await guest.goto("/");
    await waitForText(guest, HOME_TAGLINE);
    await guest.waitForTimeout(1_000);
    expect(await pageText(guest)).toContain(HOME_TAGLINE);
  });

  expect(errors, "no error alerts or page errors").toEqual([]);
});

test("a saved game that has ended is forgotten", async ({ newPlayer, errors }) => {
  const host = await newPlayer("host");
  const guest = await newPlayer("guest");
  const code = await createRoom(host, "Hannah");
  await joinRoom(guest, code, "Gus");

  // The host closes the room while the guest's page is away
  await guest.goto("about:blank");
  await clickBack(host);
  await waitForText(host, HOME_TAGLINE);

  await guest.goto("/");
  await waitForText(guest, HOME_TAGLINE);
  await guest.waitForTimeout(1_000);
  expect(await pageText(guest), "the guest stays on Home").toContain(HOME_TAGLINE);
  expect(
    await guest.evaluate(() => sessionStorage.getItem("bad-takes-session")),
    "the saved session is cleared",
  ).not.toContain("roomId");
  expect(errors, "no error alerts or page errors").toEqual([]);
});
