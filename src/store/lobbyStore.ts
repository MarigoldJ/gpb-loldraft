import { create } from "zustand";
import type { LobbyState, LobbyUser } from "@/types/lobby";

interface LobbyStore extends LobbyState {
  setUsers: (users: LobbyUser[]) => void;
  updateUser: (user: LobbyUser) => void;
  addUser: (user: LobbyUser) => void;
  removeUser: (userId: string) => void;
}

export const useLobbyStore = create<LobbyStore>((set) => ({
  gameCode: "",
  playerCount: "solo",
  users: [],
  setUsers: (users) => set({ users }),
  updateUser: (updatedUser) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === updatedUser.id ? updatedUser : user
      ),
    })),
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((user) => user.id !== userId),
    })),
}));
