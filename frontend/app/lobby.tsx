// TODO: Add in (potentially) more settings
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "@tamagui/lucide-icons";
import Animated from "react-native-reanimated";
import { listEnter, listExit, listReflow } from "../src/ui/soapbox/motion";
import { play } from "../src/audio/sfx";
import { SoapboxPage } from "../src/ui/soapbox/SoapboxPage";
import { Board } from "../src/ui/soapbox/Board";
import { CodeTiles } from "../src/ui/soapbox/CodeTiles";
import { SoapboxButton } from "../src/ui/soapbox/SoapboxButton";
import { FONTS, SOAPBOX } from "../src/ui/soapbox/tokens";
import { useGameSessionStore } from "../src/state/gameSessionStore";
import { useRoom } from "../src/hooks/useRoom";
import { useRoomActions } from "../src/hooks/useRoomActions";
import { useRules } from "../src/hooks/useRules";
import type { Player } from "../src/graphql/types";
import { reportActionError } from "../src/ui/reportError";

const LobbyScreen = () => {
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null);
  const playerId = useGameSessionStore((s) => s.session?.playerId ?? null);
  const isHost = useGameSessionStore((s) => s.session?.isHost ?? false);

  const { room, loading, error, refetch } = useRoom(roomId || undefined);
  const { leaveGame, kickPlayer, startGame } = useRoomActions(roomId || undefined);
  const rules = useRules();
  const [startLoading, setStartLoading] = useState<boolean>(false);

  // A pop when someone joins (not for the players already here when the lobby opens)
  const playerCount = room?.players.length ?? 0;
  const lastPlayerCount = useRef(playerCount);
  useEffect(() => {
    if (playerCount > lastPlayerCount.current && lastPlayerCount.current > 0) {
      play("pop");
    }
    lastPlayerCount.current = playerCount;
  }, [playerCount]);

  // Back buttons below call leaveGame so the server drops this player too; clearing only the
  // local session would leave a ghost player behind that holds up everyone else.
  if (!roomId || !playerId || (!room && loading)) {
    return (
      <SoapboxPage title="Loading..." onBack={leaveGame}>
        <ActivityIndicator size="large" color={SOAPBOX.marker} />
        <Text style={[styles.note, { marginTop: 16 }]}>Connecting to Lobby...</Text>
      </SoapboxPage>
    );
  }

  // The request failed (as opposed to the room not existing): stay in the room and let the
  // player retry, instead of treating it as the room being closed
  if (!room && error) {
    return (
      <SoapboxPage title="Can't Reach the Game" onBack={leaveGame}>
        <Text style={[styles.note, { marginBottom: 24 }]}>
          Check your connection, then try again. You’re still in the lobby.
        </Text>
        <SoapboxButton onPress={() => refetch()}>Try Again</SoapboxButton>
      </SoapboxPage>
    );
  }

  if (!room) {
    return (
      <SoapboxPage title="Lobby Not Found" onBack={leaveGame}>
        <Text style={styles.note}>
          The lobby you are trying to join does not exist or has been closed.
        </Text>
      </SoapboxPage>
    );
  }

  const handleStartGame = async () => {
    try {
      setStartLoading(true);
      await startGame();
    } catch (error) {
      reportActionError("Couldn't start the game", error);
    } finally {
      setStartLoading(false);
    }
  };

  const handleKickPlayer = async (playerIdToKick: string) => {
    try {
      await kickPlayer(playerIdToKick);
    } catch (error) {
      reportActionError("Couldn't remove that player", error);
    }
  };

  // The server's minimum (with one player there's nobody to vote)
  const hasEnoughPlayers = !!rules && room.players.length >= rules.minPlayers;

  return (
    <SoapboxPage
      title={room.settings.lobbyName || "Game Lobby"}
      subtitle={`${room.settings.rounds} ${room.settings.rounds === 1 ? "round" : "rounds"} · Writing: ${room.settings.promptTimeLimit}s · Defense: ${room.settings.timeLimit}s · Voting: ${room.settings.voteTimeLimit}s`}
      onBack={leaveGame}
    >
      <Board label="Join code">
        <View style={styles.code}>
          <CodeTiles code={room.joinCode} large />
        </View>
      </Board>

      <Board label={`Players · ${room.players.length}`} delay={120} style={{ marginTop: 34 }}>
        {room.players.map((p: Player, idx: number) => {
          const isMe = p.id === playerId;
          const last = idx === room.players.length - 1;
          return (
            // New players slide in, leavers slide out, and the rest close the gap
            <Animated.View
              key={p.id}
              entering={listEnter}
              exiting={listExit}
              layout={listReflow}
              style={[styles.player, last ? null : styles.playerDivider]}
            >
              <Text style={styles.playerName} numberOfLines={1}>
                {p.name}
                {isMe ? " (you)" : ""}
              </Text>

              <View style={styles.playerRight}>
                {p.isHost ? (
                  <View style={styles.hostTag}>
                    <Text style={styles.hostTagText}>Host</Text>
                  </View>
                ) : null}

                {/* Only the host can remove players, and not themselves */}
                {isHost && !p.isHost ? (
                  <Pressable
                    onPress={() => handleKickPlayer(p.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${p.name}`}
                    hitSlop={4}
                    style={({ pressed }) => [styles.kick, pressed ? { opacity: 0.6 } : null]}
                  >
                    <X size={18} color={SOAPBOX.boo} />
                  </Pressable>
                ) : null}
              </View>
            </Animated.View>
          );
        })}
      </Board>

      <View style={{ marginTop: 28 }}>
        {isHost ? (
          <>
            <SoapboxButton
              disabled={loading || !room || !hasEnoughPlayers}
              onPress={handleStartGame}
            >
              {startLoading ? <ActivityIndicator color={SOAPBOX.paper} /> : "Start Game"}
            </SoapboxButton>
            {!hasEnoughPlayers ? (
              <Text style={[styles.note, { marginTop: 12 }]}>
                {rules
                  ? `Waiting for at least ${rules.minPlayers} players to join...`
                  : "Waiting for players to join..."}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.note}>Waiting for the host to start the game...</Text>
        )}
      </View>
    </SoapboxPage>
  );
};

const styles = StyleSheet.create({
  note: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    color: SOAPBOX.markerSoft,
  },
  code: { paddingVertical: 12 },
  player: {
    minHeight: 56,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  playerDivider: { borderBottomWidth: 1.5, borderBottomColor: "rgba(31, 26, 23, 0.16)" },
  playerName: { flexShrink: 1, fontFamily: FONTS.bodyBold, fontSize: 17, color: SOAPBOX.marker },
  playerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  hostTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: SOAPBOX.caution,
    transform: [{ rotate: "-3deg" }],
  },
  hostTagText: {
    fontFamily: FONTS.heading,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: SOAPBOX.marker,
  },
  kick: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: SOAPBOX.boo,
    borderRadius: 4,
    backgroundColor: SOAPBOX.paper,
  },
});

export default LobbyScreen;
