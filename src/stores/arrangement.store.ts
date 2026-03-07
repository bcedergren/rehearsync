import { create } from "zustand";

interface ArrangementStore {
  currentBandId: string | null;
  currentSongId: string | null;
  currentArrangementId: string | null;

  setBand: (bandId: string) => void;
  setSong: (songId: string) => void;
  setArrangement: (arrangementId: string) => void;
  reset: () => void;
}

export const useArrangementStore = create<ArrangementStore>((set) => ({
  currentBandId: null,
  currentSongId: null,
  currentArrangementId: null,

  setBand: (currentBandId) => set({ currentBandId }),
  setSong: (currentSongId) => set({ currentSongId }),
  setArrangement: (currentArrangementId) => set({ currentArrangementId }),
  reset: () =>
    set({
      currentBandId: null,
      currentSongId: null,
      currentArrangementId: null,
    }),
}));
