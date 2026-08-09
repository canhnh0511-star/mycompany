import { create } from 'zustand';

interface OcrSessionState {
  /** Tổ "đang làm việc" trong phiên — ADR-0011: sống theo vòng đời app process, KHÔNG persist qua
   * AsyncStorage (reset khi app bị kill, chấp nhận được vì hiếm khi xảy ra giữa buổi đi thực địa). */
  activeTeamId: string | null;
  activeTeamName: string | null;
  setActiveTeam: (id: string | null, name: string | null) => void;
}

export const useOcrSessionStore = create<OcrSessionState>((set) => ({
  activeTeamId: null,
  activeTeamName: null,
  setActiveTeam: (id, name) => set({ activeTeamId: id, activeTeamName: name }),
}));
