import { create } from "zustand";

interface Participant {
  memberId: string;
  displayName: string;
  partId: string | null;
  deviceType: string;
  connectionState: string;
  driftMs: number | null;
}

interface TransportState {
  status: "stopped" | "playing" | "paused" | "seeking";
  positionMs: number;
  currentBar: number | null;
  currentSection: string | null;
  startedAtServerTime: string | null;
}

interface SessionStore {
  sessionId: string | null;
  state: string | null;
  participants: Map<string, Participant>;
  transport: TransportState;
  isConnected: boolean;

  setSession: (sessionId: string, state: string) => void;
  setTransport: (transport: Partial<TransportState>) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (memberId: string) => void;
  updateParticipant: (memberId: string, updates: Partial<Participant>) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
}

const initialTransport: TransportState = {
  status: "stopped",
  positionMs: 0,
  currentBar: null,
  currentSection: null,
  startedAtServerTime: null,
};

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  state: null,
  participants: new Map(),
  transport: initialTransport,
  isConnected: false,

  setSession: (sessionId, state) => set({ sessionId, state }),

  setTransport: (transport) =>
    set((s) => ({ transport: { ...s.transport, ...transport } })),

  addParticipant: (participant) =>
    set((s) => {
      const next = new Map(s.participants);
      next.set(participant.memberId, participant);
      return { participants: next };
    }),

  removeParticipant: (memberId) =>
    set((s) => {
      const next = new Map(s.participants);
      next.delete(memberId);
      return { participants: next };
    }),

  updateParticipant: (memberId, updates) =>
    set((s) => {
      const next = new Map(s.participants);
      const existing = next.get(memberId);
      if (existing) {
        next.set(memberId, { ...existing, ...updates });
      }
      return { participants: next };
    }),

  setConnected: (isConnected) => set({ isConnected }),

  reset: () =>
    set({
      sessionId: null,
      state: null,
      participants: new Map(),
      transport: initialTransport,
      isConnected: false,
    }),
}));
