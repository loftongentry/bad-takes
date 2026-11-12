import { useCallback } from "react";
import { router, useFocusEffect } from "expo-router";

// Several things can send a player home at almost the same moment: leaving sends a request and
// navigates when it returns, while the server's "you're no longer in the room" update makes
// useRoom navigate too. Navigation is queued and only applied after the screen updates, so a
// second "dismiss everything" would be dispatched with nothing left to dismiss and log
// "POP_TO_TOP was not handled". These flags let only the first request through.
let homeShowing = false;
let headingHome = false;

// Call from the Home screen so requests to go home while it's showing are ignored
export function useTrackHomeScreen() {
  useFocusEffect(
    useCallback(() => {
      homeShowing = true;
      headingHome = false;
      return () => {
        homeShowing = false;
      };
    }, []),
  );
}

// Back to the Home screen, once, from wherever the player is
export function goHome() {
  if (homeShowing || headingHome) {
    return;
  }
  headingHome = true;
  if (router.canDismiss()) {
    // Home is under the current screen in the stack: drop everything above it
    router.dismissAll();
  } else {
    // Home isn't in the stack (e.g. the web app was opened on /lobby directly)
    router.replace("/");
  }
}
