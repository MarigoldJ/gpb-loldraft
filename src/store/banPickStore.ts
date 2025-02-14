import { create } from "zustand";

interface BanPickState {
  bans: string[];
  picks: string[];
  setBans: (bans: string[]) => void;
  setPicks: (picks: string[]) => void;
}

export const useBanPickStore = create<BanPickState>((set) => ({
  bans: [],
  picks: [],
  setBans: (bans) => set({ bans }),
  setPicks: (picks) => set({ picks }),
}));
