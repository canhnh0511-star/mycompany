import { create } from 'zustand';
import { settingsStorage } from '@/lib/settings/settingsStorage';
import type { ModeType } from '@/components/ui/gluestack-ui-provider';

const THEME_KEY = 'mycompany_theme_mode';

interface SettingsState {
  theme: ModeType;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setTheme: (mode: ModeType) => Promise<void>;
}

/** Màn 14 "Thiết lập ứng dụng" — mục "Giao diện" (Sáng/Tối/Theo hệ thống). Đọc ở `app/_layout.tsx`
 * (GluestackUIProvider mode) thay cho hardcode `mode="system"` cũ. */
export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'system',
  hydrated: false,

  hydrate: async () => {
    const saved = await settingsStorage.get(THEME_KEY);
    set({ theme: (saved as ModeType | null) ?? 'system', hydrated: true });
  },

  setTheme: async (mode) => {
    set({ theme: mode });
    await settingsStorage.set(THEME_KEY, mode);
  },
}));
