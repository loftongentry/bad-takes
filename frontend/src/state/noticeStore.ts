import { create } from "zustand";

export type Notice = { title: string; message: string };

// The one notice on screen at a time (see NoticeHost), for things the player needs to know:
// an action that failed, or why they were sent back to the Home screen
type NoticeState = {
  notice: Notice | null;
  showNotice: (notice: Notice) => void;
  dismissNotice: () => void;
};

export const useNoticeStore = create<NoticeState>((set) => ({
  notice: null,
  showNotice: (notice) => set({ notice }),
  dismissNotice: () => set({ notice: null }),
}));

export const showNotice = (notice: Notice) => useNoticeStore.getState().showNotice(notice);
