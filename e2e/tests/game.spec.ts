import {
  HOME_TAGLINE,
  VOTE_UP,
  clickBack,
  clickLabel,
  clickText,
  createRoom,
  expect,
  joinRoom,
  pageText,
  readJoinCode,
  showsText,
  test,
  typeInto,
  waitForPattern,
  waitForText,
} from "./helpers";

test("two players play a whole game, then play again", async ({ newPlayer, errors }) => {
  const host = await newPlayer("host");
  const guest = await newPlayer("guest");

  const code = await createRoom(host, "Hannah");
  expect(code, "host creates a room").toMatch(/^[A-Z0-9]+$/);
  await test.step("Start is blocked with only 1 player", async () => {
    expect(await pageText(host)).toContain("Waiting for at least 2 players");
  });

  await test.step("guest joins with a lowercase code; host sees them live", async () => {
    await joinRoom(guest, code, "Gus");
    await waitForText(host, "Gus");
    expect(await pageText(host)).not.toContain("Waiting for at least 2 players");
  });

  await test.step("both players write a take", async () => {
    await clickText(host, "Start Game");
    await waitForText(host, "Enter Bad Take");
    await waitForText(guest, "Enter Bad Take");
    await typeInto(host, "textarea", "Pineapple belongs on pizza");
    await clickText(host, "Submit Bad Take");
    await waitForText(host, "Waiting on 1 player");
    await typeInto(guest, "textarea", "Mondays are the best day");
    await clickText(guest, "Submit Bad Take");
  });

  for (const turn of [1, 2]) {
    await test.step(`turn ${turn}: countdown, defense, then voting with a clock`, async () => {
      await waitForText(host, "Get Ready!");
      await waitForText(guest, "Get Ready!");
      await waitForPattern(host, /DEFEND THIS!|Listen Up!/i);
      const hostDefends = /DEFEND THIS!/i.test(await pageText(host));
      const [defender, voter] = hostDefends ? [host, guest] : [guest, host];

      await clickText(defender, "End Defense");
      await waitForText(voter, "Cast Your Vote");
      await waitForText(voter, "Voting closes in");
      await waitForText(defender, "The jury is deciding");
      await clickLabel(voter, VOTE_UP);
    });
  }

  await test.step("results show the tie: both players, 1 point each", async () => {
    await waitForText(host, "Game Results");
    await waitForText(guest, "Game Results");
    // The winner's sign lands a couple of seconds into the reveal. Both players stamped CHEER,
    // so each has 1 point: a tie, shared on the sign.
    await waitForPattern(host, /grand champion|it.s a tie/i);
    const text = (await pageText(host)).toLowerCase();
    expect(text).toMatch(/it.s a tie/);
    expect(text).toMatch(/hannah & gus|gus & hannah/);
    expect(text).toContain("1 pt each");
  });

  await test.step("Play Again brings both players back to the lobby", async () => {
    await clickText(host, "Play Again");
    await readJoinCode(host);
    await waitForText(guest, "Gus (you)");
  });

  await test.step("the host leaving the lobby sends the guest home", async () => {
    await clickBack(host);
    await waitForText(guest, HOME_TAGLINE, 10_000);
  });

  expect(errors, "no error alerts or page errors").toEqual([]);
});

test("the game ends for everyone when a player leaves a 2-player game", async ({
  newPlayer,
  errors,
}) => {
  // The host is on the prompt screen, which used to only listen for DEFENSE and got stuck there
  const host = await newPlayer("host");
  const guest = await newPlayer("guest");
  const code = await createRoom(host, "Hannah");
  await joinRoom(guest, code, "Gus");
  await waitForText(host, "Gus");
  await clickText(host, "Start Game");
  await waitForText(host, "Enter Bad Take");
  await waitForText(guest, "Enter Bad Take");

  await clickBack(guest);
  await waitForText(guest, HOME_TAGLINE);
  expect(await showsText(host, "Game Results", 8_000), "the host follows the room to Results").toBe(
    true,
  );
  expect(errors, "no error alerts or page errors").toEqual([]);
});

test("the game starts with the takes that came in when writing time runs out", async ({
  newPlayer,
  errors,
}) => {
  const host = await newPlayer("host");
  const guest = await newPlayer("guest");

  await clickText(host, "Create Game");
  await typeInto(host, 'input[aria-label="Lobby name"]', "Timer Test");
  await typeInto(host, 'input[aria-label="Your name"]', "Hannah");
  // Writing time defaults to 90s; step it down to the 30s minimum
  await host.evaluate(() => {
    const label = [...document.querySelectorAll<HTMLElement>("*")].find(
      (el) =>
        el.childElementCount === 0 && el.textContent === "Writing Time" && el.checkVisibility(),
    );
    let row = label?.parentElement ?? null;
    while (row && row.querySelectorAll('button, [role="button"]').length < 2) {
      row = row.parentElement;
    }
    const minus = row?.querySelectorAll<HTMLElement>('button, [role="button"]')[0];
    for (let i = 0; i < 6; i++) minus?.click();
  });
  await waitForText(host, "30s");
  await clickText(host, "Create Lobby");
  const code = await readJoinCode(host);
  expect(await pageText(host), "the lobby shows the writing time").toContain("Writing: 30s");

  await joinRoom(guest, code, "Gus");
  await waitForText(host, "Gus");
  await clickText(host, "Start Game");
  await waitForText(guest, "Enter Bad Take");
  expect(await pageText(guest), "players see how long they have to write").toMatch(/\d+s left/);

  await typeInto(host, "textarea", "Pineapple belongs on pizza");
  await clickText(host, "Submit Bad Take");
  // The waiting screen says when the game will start at the latest
  await waitForText(host, "Starting in");

  // The guest never submits. Within ~30s both are pulled into the first defense.
  await waitForText(guest, "Get Ready!", 40_000);
  await waitForText(host, "Get Ready!", 5_000);
  expect(errors, "no error alerts or page errors").toEqual([]);
});

test("the host can remove a player who holds up the game", async ({ newPlayer, errors }) => {
  // Ivy never writes a take; the host removes her mid-game and the game carries on
  const host = await newPlayer("host");
  const gus = await newPlayer("gus");
  const ivy = await newPlayer("ivy");
  const code = await createRoom(host, "Hannah");
  await joinRoom(gus, code, "Gus");
  await joinRoom(ivy, code, "Ivy");
  await waitForText(host, "Ivy");
  await clickText(host, "Start Game");
  await waitForText(gus, "Enter Bad Take");
  await waitForText(ivy, "Enter Bad Take");

  expect(await pageText(gus), "other players do not get the Players button").not.toContain(
    "Players",
  );

  await typeInto(host, "textarea", "Pineapple belongs on pizza");
  await clickText(host, "Submit Bad Take");
  await typeInto(gus, "textarea", "Mondays are the best day");
  await clickText(gus, "Submit Bad Take");
  await waitForText(host, "Waiting on 1 player");

  await clickText(host, "Players");
  await clickLabel(host, "Remove Ivy");

  await test.step("removing the missing player lets the game start for everyone else", async () => {
    await waitForText(host, "Get Ready!", 10_000);
    await waitForText(gus, "Get Ready!", 5_000);
  });
  await test.step("the removed player is sent back to the home screen", async () => {
    await waitForText(ivy, HOME_TAGLINE, 10_000);
  });
  expect(errors, "no error alerts or page errors").toEqual([]);
});
