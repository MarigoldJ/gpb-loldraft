import { DraftStep, TeamType, PlayerInfo } from "@/types/draft";

// 토너먼트 드래프트 순서 정의
export const TOURNAMENT_SEQUENCE: DraftStep[] = [
  // 1페이즈 밴
  { team: "BLUE", phase: "BAN", position: 1, index: 0 },
  { team: "RED", phase: "BAN", position: 1, index: 1 },
  { team: "BLUE", phase: "BAN", position: 2, index: 2 },
  { team: "RED", phase: "BAN", position: 2, index: 3 },
  { team: "BLUE", phase: "BAN", position: 3, index: 4 },
  { team: "RED", phase: "BAN", position: 3, index: 5 },

  // 1페이즈 픽
  { team: "BLUE", phase: "PICK", position: 1, index: 6 },
  { team: "RED", phase: "PICK", position: 1, index: 7 },
  { team: "RED", phase: "PICK", position: 2, index: 8 },
  { team: "BLUE", phase: "PICK", position: 2, index: 9 },
  { team: "BLUE", phase: "PICK", position: 3, index: 10 },
  { team: "RED", phase: "PICK", position: 3, index: 11 },

  // 2페이즈 밴
  { team: "RED", phase: "BAN", position: 4, index: 12 },
  { team: "BLUE", phase: "BAN", position: 4, index: 13 },
  { team: "RED", phase: "BAN", position: 5, index: 14 },
  { team: "BLUE", phase: "BAN", position: 5, index: 15 },

  // 2페이즈 픽
  { team: "RED", phase: "PICK", position: 4, index: 16 },
  { team: "BLUE", phase: "PICK", position: 4, index: 17 },
  { team: "BLUE", phase: "PICK", position: 5, index: 18 },
  { team: "RED", phase: "PICK", position: 5, index: 19 },
];

export const getCurrentStep = (step: number): DraftStep | null => {
  return step < TOURNAMENT_SEQUENCE.length ? TOURNAMENT_SEQUENCE[step] : null;
};

export const getTeamBans = (
  team: TeamType,
  bans: string[]
): (string | null)[] => {
  return TOURNAMENT_SEQUENCE.filter(
    (step) => step.team === team && step.phase === "BAN"
  ).map((step) => bans[step.index] || null);
};

export const getTeamPicks = (
  team: TeamType,
  picks: string[]
): (string | null)[] => {
  return TOURNAMENT_SEQUENCE.filter(
    (step) => step.team === team && step.phase === "PICK"
  ).map((step) => picks[step.index] || null);
};

export const DRAFT_SEQUENCE: DraftStep[] = [
  // 1페이즈 밴 (블루 -> 레드 번갈아가며 3개씩)
  { team: "BLUE", phase: "BAN", position: 1, index: 0 },
  { team: "RED", phase: "BAN", position: 1, index: 1 },
  { team: "BLUE", phase: "BAN", position: 2, index: 2 },
  { team: "RED", phase: "BAN", position: 2, index: 3 },
  { team: "BLUE", phase: "BAN", position: 3, index: 4 },
  { team: "RED", phase: "BAN", position: 3, index: 5 },

  // 1페이즈 픽 (블루1 -> 레드2 -> 블루2 -> 레드1)
  { team: "BLUE", phase: "PICK", position: 1, index: 6 },
  { team: "RED", phase: "PICK", position: 1, index: 7 },
  { team: "RED", phase: "PICK", position: 2, index: 8 },
  { team: "BLUE", phase: "PICK", position: 2, index: 9 },
  { team: "BLUE", phase: "PICK", position: 3, index: 10 },
  { team: "RED", phase: "PICK", position: 3, index: 11 },

  // 2페이즈 밴 (레드 -> 블루 번갈아가며 2개씩)
  { team: "RED", phase: "BAN", position: 4, index: 12 },
  { team: "BLUE", phase: "BAN", position: 4, index: 13 },
  { team: "RED", phase: "BAN", position: 5, index: 14 },
  { team: "BLUE", phase: "BAN", position: 5, index: 15 },

  // 2페이즈 픽 (레드1 -> 블루2 -> 레드1)
  { team: "RED", phase: "PICK", position: 4, index: 16 },
  { team: "BLUE", phase: "PICK", position: 4, index: 17 },
  { team: "BLUE", phase: "PICK", position: 5, index: 18 },
  { team: "RED", phase: "PICK", position: 5, index: 19 },
];

export const canInteract = (
  currentStep: DraftStep,
  playerInfo: PlayerInfo,
  playerCount: string
): boolean => {
  // 1인 진행의 경우 모든 단계 가능
  if (playerCount === "solo") return true;

  // 2인 진행의 경우 팀이 맞으면 가능
  if (playerCount === "representative") {
    return currentStep.team === playerInfo.team;
  }

  // 10인 진행의 경우
  if (playerCount === "team") {
    if (currentStep.phase === "BAN") {
      // 밴은 각 팀의 1번 포지션만 가능
      return currentStep.team === playerInfo.team && playerInfo.position === 1;
    } else {
      // 픽은 해당 포지션의 플레이어만 가능
      return (
        currentStep.team === playerInfo.team &&
        currentStep.position === playerInfo.position
      );
    }
  }

  return false;
};
