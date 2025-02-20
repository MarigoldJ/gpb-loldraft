export type TeamType = "BLUE" | "RED";
export type PhaseType = "BAN" | "PICK";

export interface DraftStep {
  team: TeamType;
  phase: PhaseType;
  position: number;
  index: number; // 순차적인 인덱스 추가
}

export interface DraftState {
  currentStep: number;
  steps: DraftStep[];
  isComplete: boolean;
}

export interface PlayerInfo {
  team: TeamType;
  position: number;
}
