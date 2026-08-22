import { create } from 'zustand';

interface OcrSessionState {
  /** Tổ "đang làm việc" trong phiên — ADR-0011: sống theo vòng đời app process, KHÔNG persist qua
   * AsyncStorage (reset khi app bị kill, chấp nhận được vì hiếm khi xảy ra giữa buổi đi thực địa). */
  activeTeamId: string | null;
  activeTeamName: string | null;
  setActiveTeam: (id: string | null, name: string | null) => void;
  /** sessionWorkDate — RULE 1 (0021-scan-batch-model, Spec 1 mục 1): nguồn ngày làm việc CHÍNH cho cả
   * phiên chụp, Admin chọn TRƯỚC khi chụp, KHÔNG suy từ OCR. Cùng vòng đời với activeTeamId (in-memory,
   * reset khi app bị kill) — không phải state của riêng CaptureScreen vì cần giữ khi điều hướng qua
   * màn Batch Review rồi quay lại chụp tiếp trong cùng phiên. */
  sessionWorkDate: string | null;
  setSessionWorkDate: (date: string | null) => void;
}

export const useOcrSessionStore = create<OcrSessionState>((set) => ({
  activeTeamId: null,
  activeTeamName: null,
  setActiveTeam: (id, name) => set({ activeTeamId: id, activeTeamName: name }),
  sessionWorkDate: null,
  setSessionWorkDate: (date) => set({ sessionWorkDate: date }),
}));
