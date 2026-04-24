import { create } from 'zustand';

/* ── Types ─────────────────────────────────────────────────────── */

export interface Participant {
  socketId: string;
  name: string;
  hasAudio: boolean;
  hasVideo: boolean;
  isScreenSharing: boolean;
}

export interface ChatMessage {
  id: string;
  senderSocketId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'user' | 'system';
}

/* ── Store state ───────────────────────────────────────────────── */

interface RoomState {
  /* identity */
  roomId: string | null;
  userName: string;
  joined: boolean;

  /* local media */
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  hasAudio: boolean;
  hasVideo: boolean;
  isScreenSharing: boolean;

  /* remote peers */
  participants: Map<string, Participant>;
  remoteStreams: Map<string, MediaStream>;
  screenShareStreams: Map<string, MediaStream>;

  /* chat */
  messages: ChatMessage[];

  /* ui */
  sidebarTab: 'chat' | 'people' | null;
  pinnedId: string | null; // socketId pinned as featured video

  /* actions */
  setRoomId: (id: string) => void;
  setUserName: (n: string) => void;
  setJoined: (v: boolean) => void;
  setLocalStream: (s: MediaStream | null) => void;
  setScreenStream: (s: MediaStream | null) => void;
  setHasAudio: (v: boolean) => void;
  setHasVideo: (v: boolean) => void;
  setIsScreenSharing: (v: boolean) => void;
  addParticipant: (p: Participant) => void;
  removeParticipant: (socketId: string) => void;
  updateParticipant: (socketId: string, patch: Partial<Participant>) => void;
  addRemoteStream: (socketId: string, stream: MediaStream) => void;
  removeRemoteStream: (socketId: string) => void;
  addScreenShareStream: (socketId: string, stream: MediaStream) => void;
  removeScreenShareStream: (socketId: string) => void;
  addMessage: (msg: ChatMessage) => void;
  setSidebarTab: (tab: 'chat' | 'people' | null) => void;
  setPinnedId: (id: string | null) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  userName: '',
  joined: false,

  localStream: null,
  screenStream: null,
  hasAudio: true,
  hasVideo: true,
  isScreenSharing: false,

  participants: new Map(),
  remoteStreams: new Map(),
  screenShareStreams: new Map(),

  messages: [],
  sidebarTab: null,
  pinnedId: null,

  setRoomId: (id) => set({ roomId: id }),
  setUserName: (n) => set({ userName: n }),
  setJoined: (v) => set({ joined: v }),
  setLocalStream: (s) => set({ localStream: s }),
  setScreenStream: (s) => set({ screenStream: s }),
  setHasAudio: (v) => set({ hasAudio: v }),
  setHasVideo: (v) => set({ hasVideo: v }),
  setIsScreenSharing: (v) => set({ isScreenSharing: v }),

  addParticipant: (p) =>
    set((s) => {
      const m = new Map(s.participants);
      m.set(p.socketId, p);
      return { participants: m };
    }),
  removeParticipant: (sid) =>
    set((s) => {
      const m = new Map(s.participants);
      m.delete(sid);
      return { participants: m };
    }),
  updateParticipant: (sid, patch) =>
    set((s) => {
      const m = new Map(s.participants);
      const existing = m.get(sid);
      if (existing) m.set(sid, { ...existing, ...patch });
      return { participants: m };
    }),

  addRemoteStream: (sid, stream) =>
    set((s) => {
      const m = new Map(s.remoteStreams);
      m.set(sid, stream);
      return { remoteStreams: m };
    }),
  removeRemoteStream: (sid) =>
    set((s) => {
      const m = new Map(s.remoteStreams);
      m.delete(sid);
      return { remoteStreams: m };
    }),

  addScreenShareStream: (sid, stream) =>
    set((s) => {
      const m = new Map(s.screenShareStreams);
      m.set(sid, stream);
      return { screenShareStreams: m };
    }),
  removeScreenShareStream: (sid) =>
    set((s) => {
      const m = new Map(s.screenShareStreams);
      m.delete(sid);
      return { screenShareStreams: m };
    }),

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setPinnedId: (id) => set({ pinnedId: id }),

  reset: () =>
    set({
      joined: false,
      localStream: null,
      screenStream: null,
      hasAudio: true,
      hasVideo: true,
      isScreenSharing: false,
      participants: new Map(),
      remoteStreams: new Map(),
      screenShareStreams: new Map(),
      messages: [],
      sidebarTab: null,
      pinnedId: null,
    }),
}));
