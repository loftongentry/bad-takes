import { describeError } from "../graphql/errors";
import { sendHome } from "../navigation/home";
import { showNotice } from "../state/noticeStore";

// For a game action that failed: tells the player why, in a notice titled `title` ("Couldn't
// start the game"). If the reason is that the game is gone, or they're no longer in it, takes
// them home instead, since there's nothing left to retry. `hint` is added to the notice (what
// happens if the player does nothing, say).
export function reportActionError(title: string, error: unknown, hint?: string) {
  const { code, message } = describeError(error);
  if (code === "ROOM_CLOSED") {
    sendHome({ title: "Game Over", message });
  } else if (code === "NOT_IN_ROOM") {
    sendHome({ title: "Removed", message });
  } else {
    showNotice({ title, message: hint ? `${message} ${hint}` : message });
  }
}
