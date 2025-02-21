export interface LobbyUser {
  id: string;
  nickname: string;
  team: "BLUE" | "RED" | "SPECTATOR";
  position: number;
  isReady: boolean;
  isHost: boolean;
}

export interface LobbyState {
  gameCode: string;
  playerCount: "representative" | "team" | "solo";
  users: LobbyUser[];
}
